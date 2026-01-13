const express = require('express');
const cors = require('cors');
const sqlite3 = require('sqlite3').verbose();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const path = require('path');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 5000;
const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-in-production';

app.use(cors());
app.use(express.json());

// Initialize database
const dbPath = path.join(__dirname, 'database.sqlite');
const db = new sqlite3.Database(dbPath);

// Initialize database tables
db.serialize(() => {
  // Users table (admin, client, user)
  db.run(`CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    username TEXT UNIQUE NOT NULL,
    email TEXT UNIQUE NOT NULL,
    password TEXT NOT NULL,
    role TEXT NOT NULL CHECK(role IN ('admin', 'client', 'user')),
    name TEXT NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  )`);

  // Workmen table
  db.run(`CREATE TABLE IF NOT EXISTS workmen (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    email TEXT,
    phone TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  )`);

  // Stages table (columns in kanban board)
  db.run(`CREATE TABLE IF NOT EXISTS stages (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    title TEXT NOT NULL,
    position INTEGER NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  )`);

  // Orders table
  db.run(`CREATE TABLE IF NOT EXISTS orders (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    client_name TEXT NOT NULL,
    description TEXT NOT NULL,
    received_date DATE NOT NULL,
    due_date DATE NOT NULL,
    stage_id INTEGER NOT NULL,
    workman_id INTEGER,
    priority INTEGER DEFAULT 0,
    status TEXT DEFAULT 'active',
    last_updated DATETIME DEFAULT CURRENT_TIMESTAMP,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (stage_id) REFERENCES stages(id),
    FOREIGN KEY (workman_id) REFERENCES workmen(id)
  )`);

  // Notes table
  db.run(`CREATE TABLE IF NOT EXISTS notes (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    order_id INTEGER NOT NULL,
    content TEXT NOT NULL,
    created_by INTEGER,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (order_id) REFERENCES orders(id),
    FOREIGN KEY (created_by) REFERENCES users(id)
  )`);

  // User stage permissions table (for client users)
  db.run(`CREATE TABLE IF NOT EXISTS user_stage_permissions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    stage_id INTEGER NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (stage_id) REFERENCES stages(id) ON DELETE CASCADE,
    UNIQUE(user_id, stage_id)
  )`);

  // Create default stages
  db.run(`INSERT OR IGNORE INTO stages (id, title, position) VALUES 
    (1, 'Received', 0),
    (2, 'Design', 1),
    (3, 'Cutting', 2),
    (4, 'Assembly', 3),
    (5, 'Finishing', 4),
    (6, 'Quality Check', 5),
    (7, 'Completed', 6)
  `);

  // Create default admin user (password: admin123)
  const defaultPassword = bcrypt.hashSync('admin123', 10);
  db.run(`INSERT OR IGNORE INTO users (username, email, password, role, name) VALUES 
    ('admin', 'admin@workshop.com', ?, 'admin', 'Administrator')
  `, [defaultPassword]);
});

// Middleware to verify JWT token
const authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ error: 'Access token required' });
  }

  jwt.verify(token, JWT_SECRET, (err, user) => {
    if (err) {
      return res.status(403).json({ error: 'Invalid or expired token' });
    }
    req.user = user;
    next();
  });
};

// Middleware to check admin role
const requireAdmin = (req, res, next) => {
  if (req.user.role !== 'admin') {
    return res.status(403).json({ error: 'Admin access required' });
  }
  next();
};

// Auth Routes
app.post('/api/auth/login', (req, res) => {
  const { username, password } = req.body;

  db.get('SELECT * FROM users WHERE username = ?', [username], (err, user) => {
    if (err) {
      return res.status(500).json({ error: 'Database error' });
    }
    if (!user) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    if (!bcrypt.compareSync(password, user.password)) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    // Get stage permissions for all users
    db.all('SELECT stage_id FROM user_stage_permissions WHERE user_id = ?', [user.id], (err, permissions) => {
      if (err) {
        return res.status(500).json({ error: 'Database error' });
      }
      const visibleStages = permissions ? permissions.map(p => p.stage_id) : [];
      
      const token = jwt.sign(
        { id: user.id, username: user.username, role: user.role, name: user.name, visibleStages },
        JWT_SECRET,
        { expiresIn: '24h' }
      );
      res.json({ 
        token, 
        user: { id: user.id, username: user.username, role: user.role, name: user.name, visibleStages } 
      });
    });
  });
});

app.post('/api/auth/register', authenticateToken, requireAdmin, (req, res) => {
  const { username, email, password, role, name, visibleStages } = req.body;

  // Validation
  if (!username || !email || !password || !role || !name) {
    return res.status(400).json({ error: 'Missing required fields' });
  }

  if (!['admin', 'client', 'user'].includes(role)) {
    return res.status(400).json({ error: 'Invalid role' });
  }

  if (password.length < 6) {
    return res.status(400).json({ error: 'Password must be at least 6 characters' });
  }

  // Client users must have at least one visible stage
  if (role === 'client' && (!visibleStages || !Array.isArray(visibleStages) || visibleStages.length === 0)) {
    return res.status(400).json({ error: 'Client users must have at least one visible stage' });
  }

  const hashedPassword = bcrypt.hashSync(password, 10);

  db.run(
    'INSERT INTO users (username, email, password, role, name) VALUES (?, ?, ?, ?, ?)',
    [username, email, hashedPassword, role, name],
    function(err) {
      if (err) {
        if (err.message.includes('UNIQUE')) {
          return res.status(400).json({ error: 'Username or email already exists' });
        }
        return res.status(500).json({ error: 'Database error' });
      }

      const userId = this.lastID;

      // Add stage permissions if provided (required for client users)
      const stagesToAdd = Array.isArray(visibleStages) ? visibleStages : [];
      if (stagesToAdd.length > 0 || role === 'client') {
        if (stagesToAdd.length === 0 && role === 'client') {
          return res.status(400).json({ error: 'Client users must have at least one visible stage' });
        }
        const insertPromises = stagesToAdd.map(stageId => {
          return new Promise((resolve, reject) => {
            const stageIdNum = parseInt(stageId);
            if (isNaN(stageIdNum)) {
              resolve(); // Skip invalid stage IDs
              return;
            }
            db.run(
              'INSERT INTO user_stage_permissions (user_id, stage_id) VALUES (?, ?)',
              [userId, stageIdNum],
              (err) => {
                if (err) {
                  console.error('Error inserting stage permission:', err);
                  reject(err);
                } else {
                  resolve();
                }
              }
            );
          });
        });

        Promise.all(insertPromises)
          .then(() => {
            res.json({ id: userId, username, email, role, name, visibleStages: stagesToAdd });
          })
          .catch((err) => {
            console.error('Error adding stage permissions:', err);
            res.json({ id: userId, username, email, role, name, visibleStages: [] });
          });
      } else {
        res.json({ id: userId, username, email, role, name, visibleStages: [] });
      }
    }
  );
});

app.get('/api/users', authenticateToken, requireAdmin, (req, res) => {
  db.all('SELECT id, username, email, role, name, created_at FROM users ORDER BY created_at DESC', [], (err, users) => {
    if (err) {
      return res.status(500).json({ error: 'Database error' });
    }

    // Get stage permissions for each user
    const usersWithPermissions = users.map((user) => {
      return new Promise((resolve) => {
        db.all('SELECT stage_id FROM user_stage_permissions WHERE user_id = ?', [user.id], (err, permissions) => {
          if (err || !permissions) {
            resolve({ ...user, visibleStages: [] });
          } else {
            resolve({ ...user, visibleStages: permissions.map(p => p.stage_id) });
          }
        });
      });
    });

    Promise.all(usersWithPermissions)
      .then((usersWithPerms) => {
        res.json(usersWithPerms);
      })
      .catch(() => {
        res.json(users.map(u => ({ ...u, visibleStages: [] })));
      });
  });
});

app.put('/api/users/:id', authenticateToken, requireAdmin, (req, res) => {
  const { id } = req.params;
  const { username, email, role, name, password, visibleStages } = req.body;

  // Validation
  if (!username || !email || !role || !name) {
    return res.status(400).json({ error: 'Missing required fields' });
  }

  if (!['admin', 'client', 'user'].includes(role)) {
    return res.status(400).json({ error: 'Invalid role' });
  }

  if (password && password.length > 0 && password.length < 6) {
    return res.status(400).json({ error: 'Password must be at least 6 characters' });
  }

  // Client users must have at least one visible stage
  if (role === 'client' && (!visibleStages || !Array.isArray(visibleStages) || visibleStages.length === 0)) {
    return res.status(400).json({ error: 'Client users must have at least one visible stage' });
  }

  let updateQuery = 'UPDATE users SET username = ?, email = ?, role = ?, name = ?';
  const updateParams = [username, email, role, name];

  if (password && password.length >= 6) {
    const hashedPassword = bcrypt.hashSync(password, 10);
    updateQuery += ', password = ?';
    updateParams.push(hashedPassword);
  }

  updateQuery += ' WHERE id = ?';
  updateParams.push(id);

  db.run(updateQuery, updateParams, function(err) {
    if (err) {
      if (err.message.includes('UNIQUE')) {
        return res.status(400).json({ error: 'Username or email already exists' });
      }
      return res.status(500).json({ error: 'Database error' });
    }
    if (this.changes === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Update stage permissions for all users
    // Delete existing permissions first
    db.run('DELETE FROM user_stage_permissions WHERE user_id = ?', [id], (err) => {
      if (err) {
        console.error('Error deleting stage permissions:', err);
        return res.status(500).json({ error: 'Database error while deleting permissions' });
      }

      // Add new permissions if provided (required for client users)
      const stagesToAdd = Array.isArray(visibleStages) ? visibleStages : [];
      if (stagesToAdd.length > 0 || role === 'client') {
        if (stagesToAdd.length === 0 && role === 'client') {
          return res.status(400).json({ error: 'Client users must have at least one visible stage' });
        }
        
        const insertPromises = stagesToAdd.map(stageId => {
          return new Promise((resolve, reject) => {
            const stageIdNum = parseInt(stageId);
            if (isNaN(stageIdNum)) {
              resolve(); // Skip invalid stage IDs
              return;
            }
            db.run(
              'INSERT INTO user_stage_permissions (user_id, stage_id) VALUES (?, ?)',
              [id, stageIdNum],
              (err) => {
                if (err) {
                  console.error('Error inserting stage permission:', err);
                  reject(err);
                } else {
                  resolve();
                }
              }
            );
          });
        });

        Promise.all(insertPromises)
          .then(() => {
            res.json({ id, username, email, role, name, visibleStages: stagesToAdd });
          })
          .catch((err) => {
            console.error('Error updating stage permissions:', err);
            res.json({ id, username, email, role, name, visibleStages: [] });
          });
      } else {
        res.json({ id, username, email, role, name, visibleStages: [] });
      }
    });
  });
});

app.delete('/api/users/:id', authenticateToken, requireAdmin, (req, res) => {
  const { id } = req.params;

  // Prevent deleting yourself
  if (parseInt(id) === req.user.id) {
    return res.status(400).json({ error: 'Cannot delete your own account' });
  }

  db.run('DELETE FROM users WHERE id = ?', [id], function(err) {
    if (err) {
      return res.status(500).json({ error: 'Database error' });
    }
    if (this.changes === 0) {
      return res.status(404).json({ error: 'User not found' });
    }
    res.json({ message: 'User deleted' });
  });
});

// Workmen Routes
app.get('/api/workmen', authenticateToken, (req, res) => {
  db.all('SELECT * FROM workmen ORDER BY name', [], (err, workmen) => {
    if (err) {
      return res.status(500).json({ error: 'Database error' });
    }
    res.json(workmen);
  });
});

app.post('/api/workmen', authenticateToken, requireAdmin, (req, res) => {
  const { name, email, phone } = req.body;

  db.run(
    'INSERT INTO workmen (name, email, phone) VALUES (?, ?, ?)',
    [name, email || null, phone || null],
    function(err) {
      if (err) {
        return res.status(500).json({ error: 'Database error' });
      }
      res.json({ id: this.lastID, name, email, phone });
    }
  );
});

app.put('/api/workmen/:id', authenticateToken, requireAdmin, (req, res) => {
  const { name, email, phone } = req.body;
  const { id } = req.params;

  db.run(
    'UPDATE workmen SET name = ?, email = ?, phone = ? WHERE id = ?',
    [name, email || null, phone || null, id],
    function(err) {
      if (err) {
        return res.status(500).json({ error: 'Database error' });
      }
      if (this.changes === 0) {
        return res.status(404).json({ error: 'Workman not found' });
      }
      res.json({ id, name, email, phone });
    }
  );
});

app.delete('/api/workmen/:id', authenticateToken, requireAdmin, (req, res) => {
  const { id } = req.params;

  db.run('DELETE FROM workmen WHERE id = ?', [id], function(err) {
    if (err) {
      return res.status(500).json({ error: 'Database error' });
    }
    if (this.changes === 0) {
      return res.status(404).json({ error: 'Workman not found' });
    }
    res.json({ message: 'Workman deleted' });
  });
});

// Stages Routes
app.get('/api/stages', authenticateToken, (req, res) => {
  db.all('SELECT * FROM stages ORDER BY position', [], (err, stages) => {
    if (err) {
      return res.status(500).json({ error: 'Database error' });
    }
    res.json(stages);
  });
});

app.post('/api/stages', authenticateToken, requireAdmin, (req, res) => {
  const { title, position } = req.body;

  db.run(
    'INSERT INTO stages (title, position) VALUES (?, ?)',
    [title, position],
    function(err) {
      if (err) {
        return res.status(500).json({ error: 'Database error' });
      }
      res.json({ id: this.lastID, title, position });
    }
  );
});

app.put('/api/stages/:id', authenticateToken, requireAdmin, (req, res) => {
  const { id } = req.params;
  const { title, position } = req.body;

  db.run(
    'UPDATE stages SET title = ?, position = ? WHERE id = ?',
    [title, position, id],
    function(err) {
      if (err) {
        return res.status(500).json({ error: 'Database error' });
      }
      if (this.changes === 0) {
        return res.status(404).json({ error: 'Stage not found' });
      }
      res.json({ id, title, position });
    }
  );
});

app.put('/api/stages/reorder', authenticateToken, requireAdmin, (req, res) => {
  const { stages } = req.body; // Array of {id, position}

  if (!Array.isArray(stages)) {
    return res.status(400).json({ error: 'Stages must be an array' });
  }

  const updatePromises = stages.map((stage) => {
    return new Promise((resolve, reject) => {
      db.run(
        'UPDATE stages SET position = ? WHERE id = ?',
        [stage.position, stage.id],
        function(err) {
          if (err) reject(err);
          else resolve();
        }
      );
    });
  });

  Promise.all(updatePromises)
    .then(() => {
      res.json({ message: 'Stages reordered successfully' });
    })
    .catch((err) => {
      res.status(500).json({ error: 'Database error' });
    });
});

app.delete('/api/stages/:id', authenticateToken, requireAdmin, (req, res) => {
  const { id } = req.params;

  // Check if any orders are using this stage
  db.get('SELECT COUNT(*) as count FROM orders WHERE stage_id = ?', [id], (err, result) => {
    if (err) {
      return res.status(500).json({ error: 'Database error' });
    }
    if (result.count > 0) {
      return res.status(400).json({ error: 'Cannot delete stage with existing orders' });
    }

    db.run('DELETE FROM stages WHERE id = ?', [id], function(err) {
      if (err) {
        return res.status(500).json({ error: 'Database error' });
      }
      if (this.changes === 0) {
        return res.status(404).json({ error: 'Stage not found' });
      }
      res.json({ message: 'Stage deleted' });
    });
  });
});

// Orders Routes
app.get('/api/orders', authenticateToken, (req, res) => {
  let query = `
    SELECT o.*, 
           s.title as stage_title,
           w.name as workman_name,
           COUNT(n.id) as notes_count
    FROM orders o
    LEFT JOIN stages s ON o.stage_id = s.id
    LEFT JOIN workmen w ON o.workman_id = w.id
    LEFT JOIN notes n ON o.id = n.order_id
  `;
  const params = [];
  const conditions = [];

  // Apply role-based filtering
  if (req.user.role === 'client') {
    // Client users: see all orders in stages they have permission to view
    if (req.user.visibleStages && req.user.visibleStages.length > 0) {
      const placeholders = req.user.visibleStages.map(() => '?').join(',');
      conditions.push(`o.stage_id IN (${placeholders})`);
      params.push(...req.user.visibleStages);
    }
  } else if (req.user.role === 'user') {
    // Regular users (workmen) see orders assigned to them AND in stages they have permission to view
    conditions.push('w.name = ?');
    params.push(req.user.name);
    
    // Filter by visible stages if user has stage permissions
    if (req.user.visibleStages && req.user.visibleStages.length > 0) {
      const placeholders = req.user.visibleStages.map(() => '?').join(',');
      conditions.push(`o.stage_id IN (${placeholders})`);
      params.push(...req.user.visibleStages);
    }
  }
  // Admin users see all orders (no filtering)

  if (conditions.length > 0) {
    query += ' WHERE ' + conditions.join(' AND ');
  }

  query += ' GROUP BY o.id ORDER BY o.priority DESC, o.created_at DESC';

  db.all(query, params, (err, orders) => {
    if (err) {
      return res.status(500).json({ error: 'Database error' });
    }

    // Add 5-day inactivity alerts
    const now = new Date();
    const MILLISECONDS_PER_DAY = 1000 * 60 * 60 * 24;
    const INACTIVITY_THRESHOLD_DAYS = 5;
    
    const ordersWithAlerts = orders.map(order => {
      const lastUpdated = new Date(order.last_updated);
      const daysSinceUpdate = (now - lastUpdated) / MILLISECONDS_PER_DAY;
      return {
        ...order,
        alert: daysSinceUpdate >= INACTIVITY_THRESHOLD_DAYS
      };
    });

    res.json(ordersWithAlerts);
  });
});

app.get('/api/orders/:id', authenticateToken, (req, res) => {
  const { id } = req.params;

  db.get(`
    SELECT o.*, 
           s.title as stage_title,
           w.name as workman_name
    FROM orders o
    LEFT JOIN stages s ON o.stage_id = s.id
    LEFT JOIN workmen w ON o.workman_id = w.id
    WHERE o.id = ?
  `, [id], (err, order) => {
    if (err) {
      return res.status(500).json({ error: 'Database error' });
    }
    if (!order) {
      return res.status(404).json({ error: 'Order not found' });
    }

    // Add 5-day inactivity alert
    const now = new Date();
    const lastUpdated = new Date(order.last_updated);
    const MILLISECONDS_PER_DAY = 1000 * 60 * 60 * 24;
    const INACTIVITY_THRESHOLD_DAYS = 5;
    const daysSinceUpdate = (now - lastUpdated) / MILLISECONDS_PER_DAY;
    order.alert = daysSinceUpdate >= INACTIVITY_THRESHOLD_DAYS;

    res.json(order);
  });
});

app.post('/api/orders', authenticateToken, (req, res) => {
  const { client_name, description, received_date, due_date, stage_id, workman_id, priority } = req.body;

  // Only admin can create orders
  if (req.user.role !== 'admin') {
    return res.status(403).json({ error: 'Only admin can create orders' });
  }

  db.run(
    'INSERT INTO orders (client_name, description, received_date, due_date, stage_id, workman_id, priority) VALUES (?, ?, ?, ?, ?, ?, ?)',
    [client_name, description, received_date, due_date, stage_id || 1, workman_id || null, priority || 0],
    function(err) {
      if (err) {
        return res.status(500).json({ error: 'Database error' });
      }
      res.json({ id: this.lastID, client_name, description, received_date, due_date, stage_id, workman_id, priority });
    }
  );
});

app.put('/api/orders/:id', authenticateToken, (req, res) => {
  const { id } = req.params;
  const { client_name, description, received_date, due_date, stage_id, workman_id, priority, status } = req.body;

  // Only admin can update orders
  if (req.user.role !== 'admin') {
    return res.status(403).json({ error: 'Only admin can update orders' });
  }

  db.run(
    'UPDATE orders SET client_name = ?, description = ?, received_date = ?, due_date = ?, stage_id = ?, workman_id = ?, priority = ?, status = ?, last_updated = CURRENT_TIMESTAMP WHERE id = ?',
    [client_name, description, received_date, due_date, stage_id, workman_id || null, priority, status || 'active', id],
    function(err) {
      if (err) {
        return res.status(500).json({ error: 'Database error' });
      }
      if (this.changes === 0) {
        return res.status(404).json({ error: 'Order not found' });
      }
      res.json({ message: 'Order updated' });
    }
  );
});

app.put('/api/orders/:id/move', authenticateToken, (req, res) => {
  const { id } = req.params;
  const { stage_id, workman_id, priority } = req.body;

  db.run(
    'UPDATE orders SET stage_id = ?, workman_id = ?, priority = ?, last_updated = CURRENT_TIMESTAMP WHERE id = ?',
    [stage_id, workman_id || null, priority || 0, id],
    function(err) {
      if (err) {
        return res.status(500).json({ error: 'Database error' });
      }
      if (this.changes === 0) {
        return res.status(404).json({ error: 'Order not found' });
      }
      res.json({ message: 'Order moved' });
    }
  );
});

app.delete('/api/orders/:id', authenticateToken, requireAdmin, (req, res) => {
  const { id } = req.params;

  db.run('DELETE FROM notes WHERE order_id = ?', [id], () => {
    db.run('DELETE FROM orders WHERE id = ?', [id], function(err) {
      if (err) {
        return res.status(500).json({ error: 'Database error' });
      }
      if (this.changes === 0) {
        return res.status(404).json({ error: 'Order not found' });
      }
      res.json({ message: 'Order deleted' });
    });
  });
});

// Notes Routes
app.get('/api/orders/:id/notes', authenticateToken, (req, res) => {
  const { id } = req.params;

  db.all(`
    SELECT n.*, u.name as created_by_name
    FROM notes n
    LEFT JOIN users u ON n.created_by = u.id
    WHERE n.order_id = ?
    ORDER BY n.created_at DESC
  `, [id], (err, notes) => {
    if (err) {
      return res.status(500).json({ error: 'Database error' });
    }
    res.json(notes);
  });
});

app.post('/api/orders/:id/notes', authenticateToken, (req, res) => {
  const { id } = req.params;
  const { content } = req.body;

  db.run(
    'INSERT INTO notes (order_id, content, created_by) VALUES (?, ?, ?)',
    [id, content, req.user.id],
    function(err) {
      if (err) {
        return res.status(500).json({ error: 'Database error' });
      }
      res.json({ id: this.lastID, order_id: id, content, created_by: req.user.id });
    }
  );
});

app.delete('/api/notes/:id', authenticateToken, (req, res) => {
  const { id } = req.params;

  // Check if user owns the note or is admin
  db.get('SELECT * FROM notes WHERE id = ?', [id], (err, note) => {
    if (err) {
      return res.status(500).json({ error: 'Database error' });
    }
    if (!note) {
      return res.status(404).json({ error: 'Note not found' });
    }

    if (note.created_by !== req.user.id && req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Not authorized' });
    }

    db.run('DELETE FROM notes WHERE id = ?', [id], function(err) {
      if (err) {
        return res.status(500).json({ error: 'Database error' });
      }
      res.json({ message: 'Note deleted' });
    });
  });
});

// Serve React app for all non-API routes in production
if (process.env.NODE_ENV === 'production') {
  app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, '../client/build/index.html'));
  });
}

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
  if (process.env.NODE_ENV === 'production') {
    console.log('Serving production build');
  }
});

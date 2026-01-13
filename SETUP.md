# Quick Setup Guide

## Step 1: Install Dependencies

Run this command from the root directory:
```bash
npm run install-all
```

This will install dependencies for:
- Root package.json
- Server (backend)
- Client (frontend)

## Step 2: Configure Environment

Create a `.env` file in the `server` directory with the following content:

```
PORT=5000
JWT_SECRET=your-super-secret-jwt-key-change-this-in-production
```

**Important**: Change the JWT_SECRET to a strong random string in production!

## Step 3: Start the Application

### Option 1: Run both servers together
```bash
npm run dev
```

### Option 2: Run servers separately

Terminal 1 (Backend):
```bash
npm run server
```

Terminal 2 (Frontend):
```bash
npm run client
```

## Step 4: Access the Application

1. Open your browser and go to: `http://localhost:3000`
2. Login with default credentials:
   - Username: `admin`
   - Password: `admin123`

## Step 5: First Steps

1. **Change the admin password** (create a new admin user and delete the default one, or update it directly in the database)
2. **Add workmen** - Click "Manage Workmen" and add your team members
3. **Create users** - Click "Manage Users" to create client and workman accounts
4. **Create your first order** - Click "New Order" to add a production order

## Troubleshooting

### Database not found
The database will be created automatically on first server start. If you need to reset it, delete `server/database.sqlite` and restart the server.

### Port already in use
- Backend port (5000): Change `PORT` in `server/.env`
- Frontend port (3000): The React dev server will prompt you to use a different port

### CORS errors
Make sure the backend is running on port 5000 and the frontend is configured to connect to `http://localhost:5000`

## Next Steps

See the main README.md for detailed documentation on features and usage.

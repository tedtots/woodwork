# Carpentry Production Workshop Task Tracker

A comprehensive task tracking application for managing carpentry production orders through a Kanban board interface. This application supports multiple user roles (Admin, Client, Workman) with role-based access control.

## Features

### Core Functionality
- **Kanban Board**: Drag-and-drop interface for managing orders through production stages
- **Order Management**: Track orders with client name, description, received date, due date, priority, and assigned workman
- **Production Stages**: Customizable stages (Received, Design, Cutting, Assembly, Finishing, Quality Check, Completed)
- **Priority System**: Admin can adjust order priorities within each stage
- **5-Day Alert**: Automatic alerts when no progress is made on an order for 5+ days
- **Notes System**: Add and manage notes for each order
- **Workmen Management**: Admin can add, edit, and delete workmen
- **User Management**: Admin can create new users with different roles

### User Roles

#### Admin View
- Full access to all orders
- Create, edit, and delete orders
- Manage workmen
- Create new users
- Adjust order priorities
- View all production stages

#### Client View
- View only their own orders
- View order details and notes
- Read-only access

#### Workman View
- View orders assigned to them
- View order details and notes
- Read-only access

## Technology Stack

### Backend
- **Node.js** with Express.js
- **SQLite** database
- **JWT** authentication
- **bcryptjs** for password hashing

### Frontend
- **React** 18
- **React Router** for navigation
- **@dnd-kit** for drag-and-drop functionality
- **Axios** for API calls
- **date-fns** for date formatting
- **React Icons** for icons

## Installation

### Prerequisites
- Node.js (v14 or higher)
- npm or yarn

### Setup Steps

1. **Install dependencies for all packages:**
   ```bash
   npm run install-all
   ```

2. **Set up environment variables:**
   Create a `.env` file in the `server` directory:
   ```
   PORT=5000
   JWT_SECRET=your-super-secret-jwt-key-change-this-in-production
   ```

3. **Start the development servers:**
   ```bash
   npm run dev
   ```
   
   This will start both the backend server (port 5000) and frontend development server (port 3000).

   Or start them separately:
   ```bash
   # Terminal 1 - Backend
   npm run server
   
   # Terminal 2 - Frontend
   npm run client
   ```

## Default Login Credentials

- **Username**: `admin`
- **Password**: `admin123`

⚠️ **Important**: Change the default admin password after first login in production!

## Usage

### Creating Orders
1. Log in as admin
2. Click "New Order" button
3. Fill in order details:
   - Client name
   - Description
   - Received date
   - Due date
   - Priority level
   - Production stage
   - Assigned workman (optional)

### Managing Orders
- **View Order**: Click on any order card to view/edit details
- **Move Order**: Drag and drop orders between stages
- **Update Priority**: Drag orders within a column to reorder by priority
- **Add Notes**: Open an order and add notes in the notes section
- **Delete Order**: Admin can delete orders from the order modal

### Managing Workmen
1. Click "Manage Workmen" in the header
2. Click "Add Workman" to create a new workman
3. Fill in name, email (optional), and phone (optional)
4. Edit or delete existing workmen as needed

### Creating Users
1. Click "Manage Users" in the header (admin only)
2. Fill in user details:
   - Name
   - Username
   - Email
   - Password (minimum 6 characters)
   - Role (Admin, Client, or Workman)

## API Endpoints

### Authentication
- `POST /api/auth/login` - User login
- `POST /api/auth/register` - Create new user (admin only)

### Orders
- `GET /api/orders` - Get all orders (filtered by role)
- `GET /api/orders/:id` - Get order details
- `POST /api/orders` - Create new order (admin only)
- `PUT /api/orders/:id` - Update order (admin only)
- `PUT /api/orders/:id/move` - Move order to different stage
- `DELETE /api/orders/:id` - Delete order (admin only)

### Workmen
- `GET /api/workmen` - Get all workmen
- `POST /api/workmen` - Create workman (admin only)
- `PUT /api/workmen/:id` - Update workman (admin only)
- `DELETE /api/workmen/:id` - Delete workman (admin only)

### Stages
- `GET /api/stages` - Get all production stages
- `POST /api/stages` - Create new stage (admin only)

### Notes
- `GET /api/orders/:id/notes` - Get notes for an order
- `POST /api/orders/:id/notes` - Add note to order
- `DELETE /api/notes/:id` - Delete note

## Database Schema

The application uses SQLite with the following tables:
- `users` - User accounts with roles
- `workmen` - Workmen information
- `stages` - Production stages
- `orders` - Order information
- `notes` - Order notes

## Production Deployment

Before deploying to production:

1. **Change JWT_SECRET** in `.env` to a strong, random secret
2. **Change default admin password** after first login
3. **Use a production database** (PostgreSQL, MySQL) instead of SQLite
4. **Set up HTTPS** for secure communication
5. **Configure CORS** properly for your domain
6. **Set up environment variables** securely
7. **Build the frontend**: `cd client && npm run build`
8. **Serve the built files** using a production server (nginx, etc.)

## Troubleshooting

### Database Issues
If you encounter database errors, delete `server/database.sqlite` and restart the server to recreate the database.

### Port Conflicts
If port 5000 or 3000 is already in use, change them in:
- Backend: `server/.env` (PORT)
- Frontend: `client/package.json` (scripts)

### CORS Errors
Make sure the backend CORS is configured to allow requests from your frontend URL.

## License

MIT

## Support

For issues or questions, please check the code comments or create an issue in the repository.
# woodwork
# woodwork

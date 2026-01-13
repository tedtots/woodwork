# Deployment Guide

## Production Build Instructions

### 1. Build the React Frontend

```bash
npm run build:all
```

This will create an optimized production build in `client/build/`.

### 2. Environment Configuration

Create a `.env` file in the `server/` directory with the following variables:

```env
PORT=5000
NODE_ENV=production
JWT_SECRET=your-strong-secret-key-here
```

For the React app, create a `.env` file in the `client/` directory (optional):

```env
REACT_APP_API_URL=https://yourdomain.com
```

If `REACT_APP_API_URL` is not set, the app will default to `http://localhost:5000`.

### 3. Install Dependencies

```bash
npm run install-all
```

### 4. Start the Production Server

```bash
npm start
```

Or from the server directory:

```bash
cd server
NODE_ENV=production node index.js
```

## Server Setup

The production server will:
- Serve the React app static files from `client/build/`
- Handle all API requests at `/api/*`
- Serve the React app for all other routes (SPA routing)

## Important Notes

1. **JWT Secret**: Change the `JWT_SECRET` in production to a strong, random string
2. **Database**: The SQLite database file (`server/database.sqlite`) will be created automatically
3. **Port**: Make sure the port you specify is not blocked by your firewall
4. **HTTPS**: For production, use a reverse proxy (nginx, Apache) with SSL certificates
5. **Process Manager**: Use PM2 or similar to keep the server running:
   ```bash
   npm install -g pm2
   pm2 start server/index.js --name carpentry-app
   pm2 save
   pm2 startup
   ```

## Nginx Configuration Example

```nginx
server {
    listen 80;
    server_name yourdomain.com;

    location / {
        proxy_pass http://localhost:5000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }
}
```

## File Structure After Build

```
Task App/
├── client/
│   └── build/          # Production build (served by Express)
├── server/
│   ├── index.js        # Express server
│   ├── database.sqlite # Database
│   └── .env           # Environment variables
└── package.json
```

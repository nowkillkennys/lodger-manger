# 🚀 System Admin Dashboard Troubleshooting Guide

## Issue: System Admin Dashboard Not Loading

**Problem:** `admin@example.com` user is being redirected to the wrong dashboard instead of `SystemAdminDashboard.jsx` with the crown icon.

**Root Cause:** Browser cache and localStorage issues preventing the updated routing logic from working.

---

## 🔍 Diagnostic Steps

### 1. Check Database User Type
```bash
cd /Users/daniel/lodger-manger/lodger-manger
node backend/scripts/check-user-data.js
```

**Expected Output:**
```
📋 All Users:
  - System Administrator (admin@example.com): sys_admin

📊 User Type Distribution:
  - sys_admin: 1 users
```

### 2. Check API Response
```bash
cd /Users/daniel/lodger-manger/lodger-manger
node backend/scripts/check-auth-me.js
```

**Expected Output:**
```
📋 /api/auth/me would return:
{
  "id": "...",
  "email": "admin@example.com",
  "user_type": "sys_admin",
  "full_name": "System Administrator"
}

🧪 Frontend routing logic test:
  ✅ Should load: SystemAdminDashboard.jsx
```

### 3. Check Container Status
```bash
cd /Users/daniel/lodger-manger/lodger-manger
docker ps -a
```

**Expected Output:**
```
CONTAINER ID   IMAGE                   STATUS                   PORTS
f58132825c03   nginx:alpine            Up 6 minutes             0.0.0.0:80->80/tcp
c5da1653d2e8   lodger-manger-frontend  Up 6 minutes             0.0.0.0:3000->80/tcp
a7959a278c04   lodger-manger-backend   Up 6 minutes             0.0.0.0:3003->3003/tcp
```

### 4. Check Application Accessibility
```bash
cd /Users/daniel/lodger-manger/lodger-manger
curl -I http://localhost
curl -s http://localhost/api/setup/status
```

**Expected Output:**
```
HTTP/1.1 200 OK
{"needs_setup":false,"user_count":5}
```

---

## 🛠️ Resolution Steps

### Step 1: Stop Development Servers
```bash
cd /Users/daniel/lodger-manger/lodger-manger
pkill -f "npm run dev"
pkill -f "vite"
```

### Step 2: Update Database Schema
```bash
cd /Users/daniel/lodger-manger/lodger-manger
node backend/scripts/update-database-schema.js
```

**Expected Output:**
```
🔄 Updating database schema to support sys_admin user type...
✅ Dropped existing user_type constraint
✅ Added new user_type constraint with sys_admin support
✅ Updated 1 user(s) to sys_admin user type
✅ Verified: admin@example.com now has user_type: sys_admin
🎉 Database schema update completed successfully!
```

### Step 3: Restart Backend
```bash
cd /Users/daniel/lodger-manger/lodger-manger
docker restart lodger_backend
```

### Step 4: Rebuild Frontend
```bash
cd /Users/daniel/lodger-manger/lodger-manger
docker-compose build --no-cache frontend
```

### Step 5: Restart Frontend Container
```bash
cd /Users/daniel/lodger-manger/lodger-manger
docker stop lodger_frontend
docker rm lodger_frontend
docker-compose up -d frontend
```

### Step 6: Verify Updated Files
```bash
cd /Users/daniel/lodger-manger/lodger-manger
docker exec lodger_frontend grep -n "sys_admin" /usr/share/nginx/html/assets/index-*.js
```

**Expected Output:**
```
260: user_type === 'sys_admin' ? (
```

---

## 🔧 Browser Cache Issues

### Primary Solution: Clear Browser Cache
```bash
# For Safari:
1. Safari → Preferences → Advanced
2. Check "Show Develop menu in menu bar"
3. Develop → Empty Caches
4. Cmd + Shift + R (hard refresh)
```

### Alternative: Clear localStorage
```javascript
// In browser console:
localStorage.clear();
sessionStorage.clear();
location.reload();
```

### Last Resort: Use Incognito Mode
```bash
# Try incognito/private browsing
# This bypasses all cache and localStorage
```

---

## 🎯 Expected Behavior After Fix

### SystemAdminDashboard.jsx (admin@example.com)
- ✅ **Crown icon** in navigation bar
- ✅ **Red gradient theme**
- ✅ **"System Administrator"** title
- ✅ **Factory Reset** button in Settings tab
- ✅ **Sub-Admin Management** tab

### AdminDashboard.jsx (Other admin users)
- ✅ **Shield icon** in navigation bar
- ✅ **Blue theme**
- ✅ **No Factory Reset** option
- ✅ **Cannot create other admins**

---

## 🔍 Common Issues & Solutions

### Issue 1: Port Confusion
**Problem:** Accessing `localhost:3001` instead of `localhost`
**Solution:** Use `http://localhost` (port 80)

### Issue 2: Development Server Running
**Problem:** `npm run dev` serving old code on port 3001
**Solution:** Stop development server, use Docker containers

### Issue 3: Browser Cache
**Problem:** Browser using cached JavaScript
**Solution:** Clear cache and localStorage

### Issue 4: Container Not Updated
**Problem:** Docker container has old build
**Solution:** Rebuild and restart containers

### Issue 5: Database Schema
**Problem:** Database doesn't support `sys_admin` user type
**Solution:** Run database migration script

---

## 🚀 Quick Fix Commands

```bash
# Stop development servers
pkill -f "npm run dev"
pkill -f "vite"

# Update database
cd /Users/daniel/lodger-manger/lodger-manger
node backend/scripts/update-database-schema.js

# Restart containers
docker restart lodger_backend
docker-compose build --no-cache frontend
docker stop lodger_frontend && docker rm lodger_frontend
docker-compose up -d frontend

# Clear browser cache (manual)
# Then access: http://localhost
```

---

## ✅ Verification Steps

1. **Check database user type:**
   ```bash
   node backend/scripts/check-user-data.js
   ```

2. **Check API response:**
   ```bash
   node backend/scripts/check-auth-me.js
   ```

3. **Check container files:**
   ```bash
   docker exec lodger_frontend grep -n "sys_admin" /usr/share/nginx/html/assets/index-*.js
   ```

4. **Test application:**
   - Navigate to `http://localhost`
   - Login with `admin@example.com`
   - Verify crown icon and red theme appear

---

## 📝 Notes

- **Always use `http://localhost` (port 80)** not `localhost:3001`
- **Clear browser cache** after any frontend updates
- **Check browser console** for debug messages
- **Use incognito mode** if cache issues persist
- **Database user_type must be `sys_admin`** for system administrator
- **Frontend routing checks `user.user_type === 'sys_admin'`**

---

## 🎉 Success Indicators

- ✅ Crown icon visible in navigation
- ✅ Red gradient theme applied
- ✅ "System Administrator" title shown
- ✅ Factory Reset option available
- ✅ Sub-Admin Management tab visible
- ✅ Browser console shows correct routing messages
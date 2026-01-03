# Project Migration & Cleanup Status

## 🚀 Microservices Architecture
The project has been migrated from a monolithic Node.js app to a microservices architecture using Docker and PostgreSQL.

### New Structure
- **`services/`**: Contains all active microservices (Auth, User, File, Outlook, Notification, Admin, Email).
- **`gateway/`**: API Gateway (Nginx/Express) routing requests to services.
- **`front/`**: React Frontend.
- **`docker-compose.yml`**: Orchestration for all services and the database.

### 🗄️ Data Migration (SQLite -> PostgreSQL)
Since direct connection to the database container was not possible during setup, a **SQL Dump** strategy was used.

1.  **Dump Generation**: A SQL file containing all your data was generated at `postgres-init/02_data.sql`.
2.  **Automatic Import**: The `docker-compose.yml` file has been configured to mount this folder.
3.  **Action Required**: When you start the database for the first time, PostgreSQL will automatically execute this script and import all your data.

**To finish the migration:**

1.  **Start All Services:**
    ```bash
    docker-compose up -d
    ```
    *The database will initialize and import your data automatically on the first run.*

### 🗑️ Cleanup Performed
- **Legacy Code**: The old monolithic code (`routes`, `utils`, `server.js`, `public`) has been deleted.
- **Migration Scripts**: The `back/` folder now only contains the database file and migration scripts for reference. You can delete it once you confirm everything is working.

### 📂 File Storage
The **File Service** is configured to read/write files directly from `../Datos` (relative to the project root), mapped to `/app/uploads` in the container. No file copying is needed.

### ⚠️ Troubleshooting
If you see `docker-compose: command not found` or `docker: command not found`:

1.  **Install Docker Desktop**: Download it from [docker.com](https://www.docker.com/products/docker-desktop/).
2.  **Start Docker Desktop**: Make sure the application is running in your taskbar.
3.  **Use the Start Script**: I have created a `start_server.bat` file in the root folder. Double-click it to run the project easily.

### 🚀 Quick Start
Simply run:
```powershell
.\start_server.bat
```

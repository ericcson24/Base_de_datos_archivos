# Global Access Setup (Cloudflare Tunnel)

To access your server from anywhere in the world without configuring port forwarding on your router, follow these steps:

1.  **Get a Cloudflare Account:** Go to [Cloudflare Zero Trust](https://one.dash.cloudflare.com/).
2.  **Create a Tunnel:**
    *   Go to **Networks** > **Tunnels**.
    *   Click **Create a Tunnel**.
    *   Choose **Cloudflared** connector.
    *   Name it (e.g., "MyHomeServer").
3.  **Get the Token:**
    *   Cloudflare will show you a command to install the connector.
    *   Look for the long string after `--token`.
    *   Copy that token.
4.  **Configure the Server:**
    *   Open the `.env` file in this folder.
    *   Add or update the line: `TUNNEL_TOKEN=your_token_here`
5.  **Route Traffic:**
    *   In the Cloudflare Dashboard, click **Next**.
    *   **Public Hostname:** Choose a domain (e.g., `myserver.mydomain.com`).
    *   **Service:** `HTTP` -> `gateway:80`
6.  **Restart:**
    *   Run `docker-compose up -d tunnel`

Now you can access `https://myserver.mydomain.com` from anywhere!

# 🔐 Microsoft Entra ID (Azure AD) Single Sign-On (SSO) Integration Guide

This guide details how to configure **Microsoft Entra ID (Azure AD) Single Sign-On** for FieldOps.

---

## 🎯 Features & Security Enforcements

1. **Organization-Only Access (Single Tenant)**: Restricts authentication strictly to employees within your Microsoft 365 organization (Tenant ID). External or personal `@outlook.com` / `@gmail.com` accounts cannot log in.
2. **Automatic Audit Trail**: Captures official user display names and corporate email addresses (`user@company.com`) directly from Microsoft Graph API and links all audit actions (creating deployments, viewing credentials, updating fields) to their user account.
3. **Seamless Provisioning**: Automatically provisions new team members upon their first successful Microsoft 365 login.

---

## 🛠️ Step 1: Azure Portal App Registration

1. Log into [portal.azure.com](https://portal.azure.com) using your corporate Microsoft 365 account.
2. Search for **Microsoft Entra ID** (formerly Azure Active Directory) in the top search bar.
3. Select **App Registrations** from the left navigation menu → click **New Registration**.
4. Configure Registration:
   - **Name**: `FieldOps Operational Platform`
   - **Supported Account Types**: Select **"Accounts in this organizational directory only (Single tenant)"**.
   - **Redirect URI**: Select **Web** and enter:
     - Local Dev: `http://localhost:3000/auth/microsoft/callback`
     - Server / Production: `https://your-server-domain.com/auth/microsoft/callback`
5. Click **Register**.

---

## 🔑 Step 2: Obtain Application Credentials

Once registered, copy the following values into your environment configuration:

1. **Client ID & Tenant ID**:
   - On the **Overview** page of your new app registration, copy:
     - **Application (client) ID** → `AZURE_CLIENT_ID`
     - **Directory (tenant) ID** → `AZURE_TENANT_ID`

2. **Client Secret**:
   - Navigate to **Certificates & secrets** → **Client secrets** tab → click **New client secret**.
   - Set description (e.g. `FieldOps SSO Secret`) and expiration.
   - Click **Add**.
   - **IMPORTANT**: Copy the **Secret Value** immediately (it will be hidden after leaving the page). This is your `AZURE_CLIENT_SECRET`.

---

## ⚙️ Step 3: Configure Environment Variables

Add the credentials to your `.env` file:

```ini
# Microsoft Entra ID (Azure AD) Single Sign-On Configuration
AZURE_CLIENT_ID=your-application-client-id-here
AZURE_CLIENT_SECRET=your-client-secret-value-here
AZURE_TENANT_ID=your-directory-tenant-id-here
AZURE_REDIRECT_URI=http://localhost:3000/auth/microsoft/callback
```

> [!NOTE]
> For production servers, replace `http://localhost:3000/auth/microsoft/callback` with your server's domain name or IP address (e.g., `https://fieldops.yourcompany.com/auth/microsoft/callback`). Ensure the exact same URI is added under Azure App **Redirect URIs**.

---

## 🚀 Step 4: Deploy & Verify SSO

Restart your Docker Compose stack to load the new environment variables:

```bash
docker compose up --build -d
```

1. Navigate to the login page (`http://localhost:3000/login`).
2. A **"Sign in with Microsoft 365"** button will automatically appear once `AZURE_CLIENT_ID` and `AZURE_TENANT_ID` are configured.
3. Click the button to log in with your corporate account.
4. Upon redirect, your display name and email address will be recorded in FieldOps for audit log tracking.

---

## ❓ Troubleshooting & FAQs

- **Error: `redirect_uri_mismatch`**:
  Ensure `AZURE_REDIRECT_URI` in `.env` matches the exact URI registered under **Azure Portal** → **App Registrations** → **Authentication** → **Redirect URIs**.
- **Error: `admin_consent_required`**:
  If your organization enforces strict consent policies, an Entra ID Admin must click **Grant admin consent for [Company]** under **API Permissions** in the Azure Portal.

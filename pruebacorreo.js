const fs = require("fs");
const path = require("path");
const nodemailer = require("nodemailer");
const { ClientSecretCredential } = require("@azure/identity");

// Scope para SMTP OAuth2 de Exchange Online (no Graph)
const SMTP_SCOPE = "https://outlook.office365.com/.default";

function loadEnv() {
  const envPath = path.join(__dirname, ".env");
  if (!fs.existsSync(envPath)) return;

  for (const line of fs.readFileSync(envPath, "utf8").split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;

    const eq = trimmed.indexOf("=");
    if (eq === -1) continue;

    const key = trimmed.slice(0, eq).trim();
    let value = trimmed.slice(eq + 1).trim();

    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }

    if (!(key in process.env)) {
      process.env[key] = value;
    }
  }
}

loadEnv();

const TENANT_ID = process.env.AZURE_TENANT_ID;
const CLIENT_ID = process.env.AZURE_CLIENT_ID;
const CLIENT_SECRET = process.env.AZURE_CLIENT_SECRET;
const SENDER_EMAIL = process.env.AZURE_SENDER_EMAIL;
const TO_EMAIL = process.env.TEST_EMAIL_TO || "webmaster@enap.edu.co";

async function enviarCorreo() {
  if (!TENANT_ID || !CLIENT_ID || !CLIENT_SECRET || !SENDER_EMAIL) {
    console.error(
      "Faltan variables en .env: AZURE_TENANT_ID, AZURE_CLIENT_ID, AZURE_CLIENT_SECRET, AZURE_SENDER_EMAIL",
    );
    process.exit(1);
  }

  try {
    console.log("Solicitando token de acceso a Microsoft Entra ID...");

    const credential = new ClientSecretCredential(
      TENANT_ID,
      CLIENT_ID,
      CLIENT_SECRET,
    );
    const tokenResponse = await credential.getToken(SMTP_SCOPE);

    if (!tokenResponse?.token) {
      throw new Error("No se obtuvo token de acceso");
    }

    console.log("Token obtenido. Configurando transporte SMTP...");

    const transporter = nodemailer.createTransport({
      host: "smtp.office365.com",
      port: 587,
      secure: false,
      auth: {
        type: "OAuth2",
        user: SENDER_EMAIL,
        accessToken: tokenResponse.token,
      },
    });

    const mailOptions = {
      from: SENDER_EMAIL,
      to: TO_EMAIL,
      subject: "Prueba de envío SMTP desde Node.js - credenciales ENAP",
      text: "Hola, correo de prueba enviado con OAuth2 y SMTP (nodemailer).",
      html: "<p>Hola, correo de prueba enviado con <b>OAuth2 y SMTP (nodemailer)</b>.</p>",
    };

    console.log(`Enviando correo a ${TO_EMAIL}...`);
    const info = await transporter.sendMail(mailOptions);
    console.log("Correo enviado correctamente. messageId:", info.messageId);
  } catch (error) {
    console.error("Error durante autenticación o envío:", error.message || error);
    process.exit(1);
  }
}

enviarCorreo();

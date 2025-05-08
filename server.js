const express = require('express');
const path = require('path');
const dotenv = require('dotenv');
const antragRoutes = require('./routes/antragRoutes');
const session = require('express-session');
const authRoutes = require('./routes/authRoutes');

dotenv.config();
const app = express();
const PORT = process.env.PORT || 3000;

// Session aktivieren
app.use(session({
  secret: 'geheimes-demo-token',
  resave: false,
  saveUninitialized: false
}));

// JSON- und Formularparser
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// 🔐 Login-Routen aktivieren
app.use('/api', authRoutes); // ✅ Funktioniert nur, wenn das Modul korrekt exportiert

// Zugriffsschutz für zentrale.html
app.get('/zentrale.html', (req, res, next) => {
  if (req.session.eingeloggt) {
    next();
  } else {
    res.redirect('/login.html');
  }
});

// Statische Dateien
app.use(express.static(path.join(__dirname, 'public')));

// API für Anträge
app.use('/api/antrag', antragRoutes);

// Server starten
app.listen(PORT, () => {
  console.log(`Server läuft auf http://localhost:${PORT}`);
});

// Zeitverzögerte Mails senden (1 Tag nach "erfasst")

// const cron = require('node-cron');
// const { sendeMailApothekeBestaetigung } = require('./emails/mailer');
// const db = require('./db/database');

// cron.schedule('*/15 * * * *', () => {
//   console.log('[Cronjob] Prüfe auf Anträge zur Benachrichtigung...');

//   const sql = `
//     SELECT * FROM antraege
//     WHERE status = 'erfasst'
//       AND benachrichtigt_am IS NULL
//       AND datetime(erfasst_am) <= datetime('now', '-1 day')
//   `;

//   db.all(sql, [], (err, rows) => {
//     if (err) {
//       console.error('Fehler beim Abrufen:', err.message);
//       return;
//     }

//     rows.forEach(antrag => {
//       sendeMailApothekeBestaetigung(antrag)
//         .then(() => {
//           console.log(`Bestätigung an ${antrag.email} gesendet.`);
//           const updateSql = `UPDATE antraege SET benachrichtigt_am = CURRENT_TIMESTAMP WHERE id = ?`;
//           db.run(updateSql, [antrag.id]);
//         })
//         .catch(err => {
//           console.error('Fehler beim Senden an Apotheke:', err.message);
//         });
//     });
//   });
// });


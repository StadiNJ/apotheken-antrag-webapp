const express = require('express');
const router = express.Router();
const db = require('../db/database');
const { sendeMailNeuerAntrag, benachrichtigeInteressenten } = require('../emails/mailer');

// POST /api/antrag – Einzelnen Antrag speichern
router.post('/', (req, res) => {
  const { pharmacode, artikel, mwst, preis, email } = req.body;

  if (!pharmacode || !artikel || !mwst || !preis || !email) {
    return res.status(400).send('❗️ Alle Felder müssen ausgefüllt sein.');
  }

  const checkQuery = 'SELECT * FROM antraege WHERE pharmacode = ?';
  db.get(checkQuery, [pharmacode], (err, row) => {
    if (err) {
      console.error('❌ Fehler bei SELECT:', err.message);
      return res.status(500).send(`❌ Datenbankfehler beim Prüfen des Pharmacodes: ${err.message}`);
    }

    if (row) {
      return res.status(409).send(`⚠️ Dieser Pharmacode (${pharmacode}) wurde bereits beantragt von ${row.email}.`);
    }

    const insertQuery = `
      INSERT INTO antraege (pharmacode, artikel, mwst, preis, email)
      VALUES (?, ?, ?, ?, ?)
    `;
    db.run(insertQuery, [pharmacode, artikel, mwst, preis, email], function (err) {
      if (err) {
        console.error('❌ Fehler bei INSERT:', err.message);
        return res.status(500).send(`❌ Fehler beim Speichern: ${err.message}`);
      }

      console.log(`✅ Neuer Antrag gespeichert (ID: ${this.lastID})`);
      res.send(`✅ Antrag für Pharmacode ${pharmacode} erfolgreich eingereicht.`);

      sendeMailNeuerAntrag({ pharmacode, artikel, mwst, preis, email })
        .then(() => console.log('📧 Benachrichtigungs-Mail gesendet.'))
        .catch(err => console.error('❌ Fehler beim Mailversand:', err.message));
    });
  });
});

// GET /api/antrag – Nur Anträge der letzten 24h oder offene anzeigen
router.get('/', (req, res) => {
  const query = `
    SELECT * FROM antraege
    WHERE status != 'erfasst' OR datetime(erfasst_am) > datetime('now', '-1 day')
    ORDER BY erstellt_am DESC
  `;
  db.all(query, [], (err, rows) => {
    if (err) {
      console.error('❌ Fehler beim Abrufen:', err.message);
      return res.status(500).send(`❌ Fehler beim Abrufen der Daten: ${err.message}`);
    }
    res.json(rows);
  });
});

// POST /api/antrag/:id/erfassen – Antrag als erfasst markieren
router.post('/:id/erfassen', (req, res) => {
  const id = req.params.id;

  const getQuery = 'SELECT * FROM antraege WHERE id = ?';
  db.get(getQuery, [id], (err, row) => {
    if (err || !row) {
      return res.status(404).send(`❗️ Antrag mit ID ${id} nicht gefunden.`);
    }

    const updateQuery = `
      UPDATE antraege
      SET status = 'erfasst', erfasst_am = CURRENT_TIMESTAMP
      WHERE id = ?
    `;
    db.run(updateQuery, [id], function (err) {
      if (err) {
        console.error('❌ Fehler beim Aktualisieren:', err.message);
        return res.status(500).send(`❌ Fehler beim Speichern: ${err.message}`);
      }

      res.send(`✅ Antrag ${id} als erfasst markiert.`);

      // 🔔 Interessenten benachrichtigen
      benachrichtigeInteressenten(row, db);
    });
  });
});

// POST /api/antrag/bulk – Mehrere Anträge speichern + Sammelmail
router.post('/bulk', (req, res) => {
  const { email, antraege } = req.body;

  if (!email || !Array.isArray(antraege) || antraege.length === 0) {
    return res.status(400).send('❗️ Ungültige Daten – mindestens ein Artikel erforderlich.');
  }

  const insertQuery = `
    INSERT INTO antraege (pharmacode, artikel, mwst, preis, email)
    VALUES (?, ?, ?, ?, ?)
  `;

  const gespeicherte = [];

  const next = (index) => {
    if (index >= antraege.length) {
      const mailText = gespeicherte.map(a => (
        `• Pharmacode: ${a.pharmacode}\n  Artikel: ${a.artikel}\n  MWST: ${a.mwst}% | CHF ${a.preis}`
      )).join('\n\n');

      const mailPayload = {
        pharmacode: 'Mehrere Anträge',
        artikel: `Total: ${gespeicherte.length} Artikel`,
        email,
        list: mailText
      };

      sendeMailNeuerAntrag(mailPayload)
        .then(() => {
          console.log('📧 Sammelmail gesendet');
          res.send(`✅ ${gespeicherte.length} Anträge erfolgreich gesendet.`);
        })
        .catch(err => {
          console.error('❌ Fehler bei Mail:', err.message);
          res.status(500).send('❌ Anträge gespeichert, aber Mail fehlgeschlagen.');
        });

      return;
    }

    const { pharmacode, artikel, mwst, preis } = antraege[index];
    if (!pharmacode || !artikel || !mwst || !preis) return next(index + 1);

    db.get('SELECT * FROM antraege WHERE pharmacode = ?', [pharmacode], (err, row) => {
      if (err || row) return next(index + 1);

      db.run(insertQuery, [pharmacode, artikel, mwst, preis, email], function (err) {
        if (!err) gespeicherte.push({ pharmacode, artikel, mwst, preis });
        next(index + 1);
      });
    });
  };

  next(0);
});

// POST /api/interesse – Interesse speichern
router.post('/interesse', (req, res) => {
  const { antrag_id, email } = req.body;

  if (!antrag_id || !email) {
    return res.status(400).send('❗️ Antrag-ID und E-Mail erforderlich.');
  }

  const query = `INSERT INTO interessenten (antrag_id, email) VALUES (?, ?)`;
  db.run(query, [antrag_id, email], function (err) {
    if (err) {
      console.error('❌ Fehler beim Speichern des Interessenten:', err.message);
      return res.status(500).send('❌ Fehler beim Speichern.');
    }
    res.send('✅ Interesse gespeichert. Sie werden benachrichtigt.');
  });
});

module.exports = router;

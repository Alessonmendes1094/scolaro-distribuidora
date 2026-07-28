const { Router } = require('express');
const fs = require('fs');
const path = require('path');
const { upload, uploadsDir } = require('../lib/upload');

const router = Router();
const configPath = path.join(uploadsDir, 'logo-config.json');

function lerConfig() {
  try {
    return JSON.parse(fs.readFileSync(configPath, 'utf-8'));
  } catch {
    return {};
  }
}

router.get('/logo', (req, res) => {
  const config = lerConfig();
  res.json({ logoUrl: config.filename ? `/uploads/${config.filename}` : null });
});

router.post('/logo', (req, res) => {
  upload.single('logo')(req, res, (err) => {
    if (err) return res.status(400).json({ error: err.message });
    if (!req.file) return res.status(400).json({ error: 'Nenhum arquivo enviado' });

    const config = lerConfig();
    if (config.filename) {
      const antigo = path.join(uploadsDir, config.filename);
      if (fs.existsSync(antigo)) fs.unlinkSync(antigo);
    }

    fs.writeFileSync(configPath, JSON.stringify({ filename: req.file.filename }));
    res.json({ logoUrl: `/uploads/${req.file.filename}` });
  });
});

module.exports = router;

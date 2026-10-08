-- Divisi
INSERT INTO divisi (kode, nama, deskripsi) VALUES
  ('DIV-IT',   'Information Technology', 'Divisi IT'),
  ('DIV-HR',   'Human Resources',         'Divisi HR'),
  ('DIV-FIN',  'Finance',                 'Divisi Keuangan'),
  ('DIV-OPS',  'Operations',              'Divisi Operasional'),
  ('DIV-MKT',  'Marketing',               'Divisi Pemasaran')
ON CONFLICT (kode) DO NOTHING;

-- Jabatan
INSERT INTO jabatan (kode, nama, deskripsi) VALUES
  ('JAB-STAF',  'Staff',          'Staff'),
  ('JAB-SPV',   'Supervisor',     'Supervisor'),
  ('JAB-MGR',   'Manager',        'Manager'),
  ('JAB-DIR',   'Director',       'Director'),
  ('JAB-CEO',   'CEO',            'Chief Executive Officer')
ON CONFLICT (kode) DO NOTHING;

-- Grade
INSERT INTO grade (kode, nama, level, min_salary, max_salary) VALUES
  ('G1', 'Grade 1', 1, 3000000,   5000000),
  ('G2', 'Grade 2', 2, 5000000,   8000000),
  ('G3', 'Grade 3', 3, 8000000,  12000000),
  ('G4', 'Grade 4', 4, 12000000, 20000000),
  ('G5', 'Grade 5', 5, 20000000, 50000000)
ON CONFLICT (kode) DO NOTHING;
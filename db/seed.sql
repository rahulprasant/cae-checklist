-- Sample seed data for industrial production checklist system

INSERT INTO machines (name) VALUES
  ('Laser Cutter'),
  ('CNC Mill'),
  ('Assembly Line 1')
ON CONFLICT DO NOTHING;

-- Materials for each machine
INSERT INTO materials (machine_id, category, name, quantity, unit)
VALUES
  (1, 'raw', 'Steel Sheet', 10, 'kg'),
  (1, 'raw', 'Aluminium Sheet', 5, 'kg'),
  (1, 'fabrication', 'Laser Cut Panel', 2, 'pcs'),
  (1, 'purchase', 'Protective Glass', 1, 'pcs'),

  (2, 'raw', 'Steel Block', 8, 'kg'),
  (2, 'fabrication', 'Milled Housing', 4, 'pcs'),
  (2, 'purchase', 'Cutting Fluid', 2, 'l'),

  (3, 'raw', 'Fasteners', 100, 'pcs'),
  (3, 'fabrication', 'Sub-Assembly A', 3, 'pcs'),
  (3, 'purchase', 'Packaging Box', 10, 'pcs');

-- Initial stock levels for key materials (by material_name)
INSERT INTO stock (material_name, available_quantity, minimum_threshold)
VALUES
  ('Steel Sheet', 100, 20),
  ('Aluminium Sheet', 60, 15),
  ('Laser Cut Panel', 20, 5),
  ('Protective Glass', 10, 3),
  ('Steel Block', 80, 20),
  ('Milled Housing', 30, 5),
  ('Cutting Fluid', 50, 10),
  ('Fasteners', 1000, 200),
  ('Sub-Assembly A', 25, 5),
  ('Packaging Box', 200, 40)
ON CONFLICT (material_name) DO NOTHING;

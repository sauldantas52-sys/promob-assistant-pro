INSERT INTO validation_checks (project_id, check_type, is_completed, completed_by, evidence_source) 
VALUES ('6b916a15-0241-4918-b1fc-d941ac414f1e', 'visual_ingestion', true, '55010761-d5d8-47d0-b201-fb030af00b62', 'promob_xml')
ON CONFLICT (project_id, check_type) DO UPDATE SET is_completed = true;

UPDATE projects 
SET machining_blocked = false, 
    machining_status = 'liberado', 
    operational_status = 'pronto_para_producao' 
WHERE id = '6b916a15-0241-4918-b1fc-d941ac414f1e';
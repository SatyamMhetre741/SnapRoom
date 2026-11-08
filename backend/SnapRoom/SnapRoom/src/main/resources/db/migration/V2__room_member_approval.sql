ALTER TABLE room_members
    ADD COLUMN IF NOT EXISTS approval_status VARCHAR(20) NOT NULL DEFAULT 'APPROVED';

ALTER TABLE room_members
    ADD CONSTRAINT room_members_approval_status_check
    CHECK (approval_status IN ('PENDING', 'APPROVED', 'REJECTED'));

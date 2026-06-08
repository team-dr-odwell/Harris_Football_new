-- ===================================================================
-- OWFC Harris — real training schedule + events
-- Training nights are a weekly recurring schedule handled in the app
-- (shown on the month calendar), so we clear the sample one-off
-- training rows. Then we load the real club events.
-- Run in Supabase: SQL Editor -> New query -> Run.
-- ===================================================================

-- events: add optional time + link columns
alter table events add column if not exists time text;
alter table events add column if not exists link text;

-- clear the placeholder training + events
delete from training_sessions;
delete from events;

-- real club events
insert into events (title, description, location, date, time, link, img) values
('Club Awards Afternoon',
 'Our end-of-season celebration — trophies, medals and a big well done to every player for a brilliant season. Families welcome!',
 'TBC', '2026-06-14', null, null, 'trophy'),
('FootGolf',
 'A fun team morning of FootGolf at High Elms. Kick-off 11:00am. Tap the link for location and prices.',
 'High Elms Golf Course', '2026-06-27', '11:00',
 'https://www.mytimeactive.co.uk/locations/footgolf-high-elms-golf-course', 'flag');

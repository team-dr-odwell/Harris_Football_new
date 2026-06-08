-- ===================================================================
-- OWFC Harris — full 2025/26 season, 22 games WITH results.
-- Source: the manager's match-history record (authoritative).
-- Scores are our_score:their_score. Record: 10 W - 12 L - 0 D.
-- Clears existing fixtures and loads the real played games.
-- (Goalscorers/assists/MOTM can still be added per game via Admin.)
-- Run in Supabase: SQL Editor -> New query -> Run.
-- ===================================================================

delete from fixtures;

insert into fixtures (status, date, kickoff, opponent, home_away, ground, address, competition, our_score, their_score, result) values
('past','2025-09-21','09:46','Start of Season (opponent no-show)','A','','', 'Pre-season', 6,0,'W'),
('past','2025-09-28','09:32','The Warren Tigers','H','Hawes Down Pitches','Hawes Lane, West Wickham, BR4 9AE','U10 Ladder', 2,5,'L'),
('past','2025-10-05','10:11','Moving Matters FC Bears','A','Tooting Common','Doctor Johnson Avenue, Tooting, London, SW17 8JJ','U10 Ladder', 7,3,'W'),
('past','2025-10-12','12:31','Westerham Juniors Tigers','H','Hawes Down Pitches','Hawes Lane, West Wickham, BR4 9AE','U10 Ladder', 4,0,'W'),
('past','2025-11-02','10:02','Selsdon Junior Eagles','A','Croydon Postal Ground','Trenham Drive, Warlingham, Surrey, CR6 9RU','Autumn Vase', 1,5,'L'),
('past','2025-11-09','09:34','Beckenham United FC Hawks','H','Hawes Down Pitches','Hawes Lane, West Wickham, BR4 9AE','Autumn Vase', 2,0,'W'),
('past','2025-11-16','11:00','Penge Panthers','H','Hawes Down Pitches','Hawes Lane, West Wickham, BR4 9AE','Autumn Vase', 2,5,'L'),
('past','2025-11-23','12:30','Selsdon Junior Tigers','H','Hawes Down Pitches','Hawes Lane, West Wickham, BR4 9AE','U10 Ladder', 2,0,'W'),
('past','2025-11-30','12:32','Petts Wood Redshanks','A','Petts Wood FC','Barnet Wood Road, Hayes, Bromley, BR2 7AA','Autumn Vase (semi-final)', 2,0,'W'),
('past','2025-12-07','09:31','Petts Wood Ravens','H','Hawes Down Pitches','Hawes Lane, West Wickham, BR4 9AE','U10 Ladder', 4,0,'W'),
('past','2025-12-14','10:47','AFC Shortlands Hurricanes','A','Queensmead Recreation Ground','Glassmill Lane, Bromley, BR2 0EY','Autumn Vase (final)', 1,3,'L'),
('past','2026-01-11','11:33','Lewisham Red','H','Hawes Down Pitches','Hawes Lane, West Wickham, BR4 9AE','U10 Ladder', 3,0,'W'),
('past','2026-02-01','13:01','Beckenham Town JFC White','H','Hawes Down Pitches','Hawes Lane, West Wickham, BR4 9AE','U10 Ladder', 1,7,'L'),
('past','2026-02-22','10:00','Penge Panthers','A','Alexandra Junior School','Cator Road, Sydenham, London, SE26 5DS','Spring Vase', 1,2,'L'),
('past','2026-03-01','09:53','Lewisham Tigers Reds','A','Downham Lower Fields','Glenbow Road, Bromley, BR1 4RL','Spring Vase', 3,2,'W'),
('past','2026-03-08','11:31','Norbury Green FC','H','Hawes Down Pitches','Hawes Lane, West Wickham, BR4 9AE','Spring Vase', 2,5,'L'),
('past','2026-03-22','09:32','Westerham Tigers','A','Westerham Junior FC','Kings Road, Westerham, TN16','U10 Ladder', 0,2,'L'),
('past','2026-04-19','09:59','Orpington Town FC Jaguars','H','Hawes Down Pitches','Hawes Lane, West Wickham, BR4 9AE','Spring Vase (semi-final)', 0,2,'L'),
('past','2026-04-26','10:01','Old Bromleians','A','Bromleians Football Club','The John Cooper Grounds, Lower Gravel Road, Bromley, BR2 8LL','U10 Ladder', 4,3,'W'),
('past','2026-05-03','10:00','Farnborough Old Boys Guild','H','Hawes Down Pitches','Hawes Lane, West Wickham, BR4 9AE','U10 Ladder', 0,3,'L'),
('past','2026-05-10','12:33','The Warren Tigers','A','Metropolitan Police Sports & Social Club','The Warren, Croydon Road, Hayes, Bromley, BR2 7AL','U10 Ladder', 3,5,'L'),
('past','2026-05-17','12:00','West Wickham Sky','A','West Wickham Football Club','Corkscrew Hill, West Wickham, BR4 9BB','Spring Vase', 1,2,'L');

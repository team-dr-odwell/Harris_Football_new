-- ===================================================================
-- OWFC Harris — full 2025/26 Tandridge League season (from Gmail).
-- Clears placeholder fixtures and loads all 24 real fixtures.
-- League emails don't include final scores, so each loads with a
-- "Score to add" tag — enter results via ⚙ Admin → Enter result.
-- Run in Supabase: SQL Editor -> New query -> Run.
-- ===================================================================

delete from fixtures;   -- removes placeholder fixtures (and their goals/attendance)

insert into fixtures (status, date, kickoff, opponent, home_away, ground, address, competition) values
-- Autumn 2025
('past','2025-09-28','09:30','The Warren Tigers','H','Hawes Down Pitches','Hawes Lane, West Wickham, BR4 9AE','U10 Ladder'),
('past','2025-10-05','10:00','Moving Matters FC Bears','A','Tooting Common','Doctor Johnson Avenue, Tooting, London, SW17 8JJ','U10 Ladder'),
('past','2025-10-12','12:30','Westerham Juniors Tigers','H','Hawes Down Pitches','Hawes Lane, West Wickham, BR4 9AE','U10 Ladder'),
('past','2025-10-19','10:00','West Wickham Sky','A','West Wickham Football Club','Corkscrew Hill, West Wickham, BR4 9BB','U10 Ladder'),
('past','2025-11-02','10:00','Selsdon Junior Eagles','A','Croydon Postal Ground','Trenham Drive, Warlingham, Surrey, CR6 9RU','Autumn Vase Two'),
('past','2025-11-09','09:30','Beckenham United FC Hawks','H','Hawes Down Pitches','Hawes Lane, West Wickham, BR4 9AE','Autumn Vase Two'),
('past','2025-11-16','11:00','Penge Panthers','H','Hawes Down Pitches','Hawes Lane, West Wickham, BR4 9AE','Autumn Vase Two'),
('past','2025-11-23','12:30','Selsdon Junior Tigers','H','Hawes Down Pitches','Hawes Lane, West Wickham, BR4 9AE','U10 Ladder'),
('past','2025-11-30','12:30','Petts Wood Redshanks','A','Petts Wood FC','Barnet Wood Road, Hayes, Bromley, BR2 7AA','Autumn Copper Vase'),
('past','2025-12-07','09:30','Petts Wood Ravens','H','Hawes Down Pitches','Hawes Lane, West Wickham, BR4 9AE','U10 Ladder'),
('past','2025-12-14','10:45','AFC Shortlands Hurricanes','A','Queensmead Recreation Ground','Glassmill Lane, Bromley, BR2 0EY','Autumn Copper Vase'),
-- Winter / Spring 2026
('past','2026-01-25','13:00','Chislehurst Glebe FC Tigers','A','Glebe Football Club','Foxbury Avenue, Chislehurst, BR7 6SD','U10 Ladder'),
('past','2026-02-01','13:00','Beckenham Town JFC White','H','Hawes Down Pitches','Hawes Lane, West Wickham, BR4 9AE','U10 Ladder'),
('past','2026-02-08','11:30','Norbury Green FC','H','Hawes Down Pitches','Hawes Lane, West Wickham, BR4 9AE','Spring Vase Five'),
('past','2026-02-22','10:00','Penge Panthers','A','Alexandra Junior School','Cator Road, Sydenham, London, SE26 5DS','Spring Vase Five'),
('past','2026-03-01','09:45','Lewisham Tigers Reds','A','Downham Lower Fields','Glenbow Road, Bromley, BR1 4RL','Spring Vase Five'),
('past','2026-03-08','11:30','Norbury Green FC','H','Hawes Down Pitches','Hawes Lane, West Wickham, BR4 9AE','Spring Vase Five'),
('past','2026-03-15','12:30','Tulse Hill','H','Hawes Down Pitches','Hawes Lane, West Wickham, BR4 9AE','U10 Ladder'),
('past','2026-04-12','11:00','London Kickers FC Blue','H','Hawes Down Pitches','Hawes Lane, West Wickham, BR4 9AE','U10 Ladder'),
('past','2026-04-19','10:00','Orpington Town FC Jaguars','H','Hawes Down Pitches','Hawes Lane, West Wickham, BR4 9AE','Spring Copper Vase'),
('past','2026-04-26','10:00','Bromleians','A','Bromleians Football Club','The John Cooper Grounds, Lower Gravel Road, Bromley, BR2 8LL','U10 Ladder'),
('past','2026-05-03','10:00','Farnborough Old Boys Guild','H','Hawes Down Pitches','Hawes Lane, West Wickham, BR4 9AE','U10 Ladder'),
('past','2026-05-10','12:30','The Warren Tigers','A','Metropolitan Police Sports & Social Club','The Warren, Croydon Road, Hayes, Bromley, BR2 7AL','U10 Ladder'),
('past','2026-05-17','12:00','West Wickham Sky','A','West Wickham Football Club','Corkscrew Hill, West Wickham, BR4 9BB','Spring Copper Vase');

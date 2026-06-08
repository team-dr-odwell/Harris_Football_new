-- ===================================================================
-- OWFC Harris — replace the placeholder squad with the REAL squad.
-- Safe to run on your live Supabase. Clears the sample match data
-- (which was tied to the old placeholder players) so no fake stats
-- get attached to real children. Run in SQL Editor -> New query.
-- ===================================================================

-- 1. add captain support
alter table players add column if not exists captain boolean default false;

-- 2. clear sample match data tied to the old squad
delete from goals;
delete from attendance;
delete from game_points;
update fixtures set status='upcoming', our_score=null, their_score=null, result=null, motm=null;

-- 3. swap in the real squad (season stats start at 0)
delete from players;
insert into players (id, number, name, pos, rating, pace, shooting, passing, dribbling, defending, physical, games, goals, assists, motm, captain, init, program) overriding system value values (1, 1, 'Sam Kirby', 'GK', 82, 70, 45, 72, 60, 85, 78, 0, 0, 0, 0, true, 'SK', '["Shot-stopping — low and high saves","Distribution to a target, throws & kicks","Commanding the box and organising the defence","Quick feet and a strong set position"]');
insert into players (id, number, name, pos, rating, pace, shooting, passing, dribbling, defending, physical, games, goals, assists, motm, captain, init, program) overriding system value values (2, 2, 'Daniel O''Loughlin', 'CB', 80, 74, 50, 76, 64, 84, 80, 0, 0, 0, 0, false, 'DO', '["1v1 defending — jockey, delay, tackle","Heading at both ends of the pitch","Playing out from the back with composure","Communication and holding the line"]');
insert into players (id, number, name, pos, rating, pace, shooting, passing, dribbling, defending, physical, games, goals, assists, motm, captain, init, program) overriding system value values (3, 3, 'Diego Cappello-Spedding', 'RB', 80, 83, 52, 74, 73, 80, 72, 0, 0, 0, 0, false, 'DC', '["Defending the wing 1v1","Overlapping runs and quality crosses","Recovery sprints to get back","First touch to start attacks"]');
insert into players (id, number, name, pos, rating, pace, shooting, passing, dribbling, defending, physical, games, goals, assists, motm, captain, init, program) overriding system value values (4, 4, 'Charlie Rodwell', 'CM', 82, 76, 68, 84, 80, 72, 74, 0, 0, 0, 0, false, 'CR', '["Receiving on the half-turn and scanning first","Range of passing — short and long","Driving forward with the ball","Pressing and winning the ball back"]');
insert into players (id, number, name, pos, rating, pace, shooting, passing, dribbling, defending, physical, games, goals, assists, motm, captain, init, program) overriding system value values (5, 5, 'Sebestian Wallace', 'LM', 81, 85, 64, 78, 83, 60, 66, 0, 0, 0, 0, false, 'SW', '["Beating your player 1v1","End product — crosses and shots","Tracking back to help your full-back","An explosive first step"]');
insert into players (id, number, name, pos, rating, pace, shooting, passing, dribbling, defending, physical, games, goals, assists, motm, captain, init, program) overriding system value values (6, 6, 'Duke Lands', 'CB', 80, 72, 50, 75, 62, 84, 80, 0, 0, 0, 0, false, 'DL', '["1v1 defending — jockey, delay, tackle","Heading at both ends of the pitch","Playing out from the back with composure","Communication and holding the line"]');
insert into players (id, number, name, pos, rating, pace, shooting, passing, dribbling, defending, physical, games, goals, assists, motm, captain, init, program) overriding system value values (7, 7, 'Jack Horrell', 'ST', 83, 88, 84, 72, 84, 52, 72, 0, 0, 0, 0, false, 'JH', '["Finishing first-time in the box","Movement to lose your marker","Hold-up play and linking with the team","Leading the press from the front"]');
insert into players (id, number, name, pos, rating, pace, shooting, passing, dribbling, defending, physical, games, goals, assists, motm, captain, init, program) overriding system value values (8, 8, 'Alex Biondini', 'CM', 82, 76, 70, 84, 80, 70, 72, 0, 0, 0, 0, false, 'AB', '["Receiving on the half-turn and scanning first","Range of passing — short and long","Driving forward with the ball","Pressing and winning the ball back"]');
insert into players (id, number, name, pos, rating, pace, shooting, passing, dribbling, defending, physical, games, goals, assists, motm, captain, init, program) overriding system value values (9, 9, 'Rio Ballin-Blagrove', 'ST', 83, 86, 84, 70, 82, 50, 74, 0, 0, 0, 0, false, 'RB', '["Finishing first-time in the box","Movement to lose your marker","Hold-up play and linking with the team","Leading the press from the front"]');
insert into players (id, number, name, pos, rating, pace, shooting, passing, dribbling, defending, physical, games, goals, assists, motm, captain, init, program) overriding system value values (10, 10, 'Archie Wyatt', 'RM', 82, 86, 68, 78, 84, 60, 66, 0, 0, 0, 0, false, 'AW', '["Beating your player 1v1","End product — crosses and shots","Tracking back to help your full-back","An explosive first step"]');
insert into players (id, number, name, pos, rating, pace, shooting, passing, dribbling, defending, physical, games, goals, assists, motm, captain, init, program) overriding system value values (11, 11, 'Sam Butcher', 'CM', 80, 78, 64, 80, 78, 68, 70, 0, 0, 0, 0, false, 'SB', '["Receiving on the half-turn and scanning first","Range of passing — short and long","Driving forward with the ball","Pressing and winning the ball back"]');
insert into players (id, number, name, pos, rating, pace, shooting, passing, dribbling, defending, physical, games, goals, assists, motm, captain, init, program) overriding system value values (14, 14, 'Lucci Verico', 'CM', 80, 77, 66, 82, 79, 70, 70, 0, 0, 0, 0, false, 'LV', '["Receiving on the half-turn and scanning first","Range of passing — short and long","Driving forward with the ball","Pressing and winning the ball back"]');
select setval(pg_get_serial_sequence('players','id'), (select max(id) from players));

-- 4. start the Academy League with everyone at 0
insert into game_points (player_id, attendance, training, quiz, exercise, badges)
select id, 0, 0, 0, 0, '[]' from players;

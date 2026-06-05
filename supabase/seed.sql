-- OWFC Harris — sample 2025/26 seed data. Run AFTER schema.sql.
insert into seasons (name, league, is_current) values ('2025/26','North Tyneside Junior League — Division 2',true);

-- PLAYERS
insert into players (id, number, name, pos, rating, pace, shooting, passing, dribbling, defending, physical, games, goals, assists, motm, clean_sheets, program, init) overriding system value values (1, 1, 'Oscar Bennett', 'GK', 78, 62, 40, 70, 55, 80, 74, 11, 0, 1, 2, 5, '["Distribution under pressure — roll-outs to full-backs","Shot-stopping: low dives both sides","Footwork ladder + quick set position","Communication: organise the back four"]', 'OB');
insert into players (id, number, name, pos, rating, pace, shooting, passing, dribbling, defending, physical, games, goals, assists, motm, clean_sheets, program, init) overriding system value values (2, 2, 'Leo Carter', 'RB', 80, 84, 55, 74, 72, 78, 70, 12, 1, 4, 1, 0, '["Overlapping runs & timing of the cross","1v1 defending — jockey & delay","Recovery sprints to the back post","Switching play with the outside foot"]', 'LC');
insert into players (id, number, name, pos, rating, pace, shooting, passing, dribbling, defending, physical, games, goals, assists, motm, clean_sheets, program, init) overriding system value values (3, 3, 'Finn Walsh', 'LB', 77, 81, 48, 71, 70, 75, 66, 10, 0, 3, 1, 0, '["Weak-foot crossing reps","Defensive body shape — show inside","Underlap into the half-space","First-touch out of the back"]', 'FW');
insert into players (id, number, name, pos, rating, pace, shooting, passing, dribbling, defending, physical, games, goals, assists, motm, clean_sheets, program, init) overriding system value values (4, 4, 'Harry Dawson', 'CB', 81, 70, 52, 76, 60, 85, 82, 12, 2, 0, 3, 0, '["Heading: attacking & defensive contact","Stepping in to intercept","Long diagonal switch","Defending the front post at set pieces"]', 'HD');
insert into players (id, number, name, pos, rating, pace, shooting, passing, dribbling, defending, physical, games, goals, assists, motm, clean_sheets, program, init) overriding system value values (5, 5, 'Max Thompson', 'CB', 79, 72, 46, 78, 63, 82, 78, 11, 1, 2, 1, 0, '["Playing out from the back — split the press","Aerial duels & second balls","Covering & sweeping behind","Timing the slide tackle"]', 'MT');
insert into players (id, number, name, pos, rating, pace, shooting, passing, dribbling, defending, physical, games, goals, assists, motm, clean_sheets, program, init) overriding system value values (6, 6, 'Charlie Hughes', 'CDM', 82, 74, 64, 83, 75, 80, 79, 12, 2, 5, 2, 0, '["Screening the back four — scanning","Long & short range passing","Driving forward with the ball","Recovering the second ball"]', 'CH');
insert into players (id, number, name, pos, rating, pace, shooting, passing, dribbling, defending, physical, games, goals, assists, motm, clean_sheets, program, init) overriding system value values (7, 7, 'Jack Morgan', 'RW', 84, 90, 78, 76, 88, 55, 64, 12, 9, 6, 4, 0, '["Beating the full-back 1v1 — feints","Cutting in onto the left foot to shoot","End product: low driven crosses","High press triggers from the wing"]', 'JM');
insert into players (id, number, name, pos, rating, pace, shooting, passing, dribbling, defending, physical, games, goals, assists, motm, clean_sheets, program, init) overriding system value values (8, 8, 'Noah Patel', 'CM', 80, 75, 66, 84, 80, 68, 70, 11, 3, 7, 2, 0, '["Receiving on the half-turn","Through balls into the channels","Late runs into the box","Press & counter-press as a unit"]', 'NP');
insert into players (id, number, name, pos, rating, pace, shooting, passing, dribbling, defending, physical, games, goals, assists, motm, clean_sheets, program, init) overriding system value values (9, 9, 'Freddie Clarke', 'ST', 83, 82, 86, 68, 78, 48, 76, 12, 14, 3, 5, 0, '["Finishing: first time inside the box","Movement across the front defender","Hold-up play & link with midfield","Penalty technique & composure"]', 'FC');
insert into players (id, number, name, pos, rating, pace, shooting, passing, dribbling, defending, physical, games, goals, assists, motm, clean_sheets, program, init) overriding system value values (10, 10, 'Alfie Reid', 'CAM', 83, 78, 74, 86, 85, 52, 66, 12, 6, 9, 3, 0, '["Playing between the lines — find pockets","Disguised through passes","Shooting from the edge of the box","Set-piece delivery"]', 'AR');
insert into players (id, number, name, pos, rating, pace, shooting, passing, dribbling, defending, physical, games, goals, assists, motm, clean_sheets, program, init) overriding system value values (11, 11, 'Theo Murray', 'LW', 81, 88, 70, 74, 84, 53, 62, 10, 7, 4, 2, 0, '["1v1 on the touchline — explosive first step","Right-foot finishes cutting inside","Tracking back to support the full-back","Counter-attack runs in behind"]', 'TM');
insert into players (id, number, name, pos, rating, pace, shooting, passing, dribbling, defending, physical, games, goals, assists, motm, clean_sheets, program, init) overriding system value values (12, 12, 'Sam Doyle', 'GK', 74, 60, 38, 66, 50, 76, 70, 5, 0, 0, 1, 2, '["Handling crosses with confidence","Set position & angles","Quick distribution to start attacks","Reaction saves — close range"]', 'SD');
insert into players (id, number, name, pos, rating, pace, shooting, passing, dribbling, defending, physical, games, goals, assists, motm, clean_sheets, program, init) overriding system value values (14, 14, 'Riley Evans', 'CM', 78, 76, 60, 79, 74, 66, 68, 9, 2, 3, 1, 0, '["Box-to-box engine — repeated efforts","Tackling & winning it back","Forward passes that break lines","Arriving late in the box"]', 'RE');
insert into players (id, number, name, pos, rating, pace, shooting, passing, dribbling, defending, physical, games, goals, assists, motm, clean_sheets, program, init) overriding system value values (15, 15, 'George Hill', 'ST', 77, 80, 76, 62, 72, 46, 72, 8, 5, 1, 1, 0, '["Finishing on the stretch","Pressing from the front","Running the channels","First touch with back to goal"]', 'GH');
select setval(pg_get_serial_sequence('players','id'), (select max(id) from players));

-- FIXTURES
insert into fixtures (id, season_id, status, date, kickoff, meetup, opponent, home_away, ground, address, kit, competition, our_score, their_score, result, motm) overriding system value values (101, 1, 'past', '2025-09-14', '10:00', '09:30', 'Wallsend Boys Club', 'H', 'Harris Park, Pitch 3', 'Harris Park, Coast Rd, Newcastle NE28 9JA', 'gold', 'League', 4, 1, 'W', 9);
insert into fixtures (id, season_id, status, date, kickoff, meetup, opponent, home_away, ground, address, kit, competition, our_score, their_score, result, motm) overriding system value values (102, 1, 'past', '2025-09-21', '11:30', '11:00', 'Cramlington Juniors', 'A', 'Beaconhill Sports Ground', 'Burnside, Cramlington NE23 6QP', 'black', 'League', 2, 2, 'D', 6);
insert into fixtures (id, season_id, status, date, kickoff, meetup, opponent, home_away, ground, address, kit, competition, our_score, their_score, result, motm) overriding system value values (103, 1, 'past', '2025-09-28', '10:00', '09:30', 'Ponteland United', 'H', 'Harris Park, Pitch 3', 'Harris Park, Coast Rd, Newcastle NE28 9JA', 'gold', 'League', 3, 0, 'W', 7);
insert into fixtures (id, season_id, status, date, kickoff, meetup, opponent, home_away, ground, address, kit, competition, our_score, their_score, result, motm) overriding system value values (104, 1, 'past', '2025-10-12', '12:00', '11:30', 'Gosforth Bohemians', 'A', 'Broadway West Playing Fields', 'Broadway W, Gosforth NE3 2HD', 'black', 'Cup', 1, 3, 'L', 4);
insert into fixtures (id, season_id, status, date, kickoff, meetup, opponent, home_away, ground, address, kit, competition, our_score, their_score, result, motm) overriding system value values (105, 1, 'past', '2025-10-19', '10:00', '09:30', 'Whitley Bay Storm', 'H', 'Harris Park, Pitch 3', 'Harris Park, Coast Rd, Newcastle NE28 9JA', 'gold', 'League', 5, 2, 'W', 7);
insert into fixtures (id, season_id, status, date, kickoff, meetup, opponent, home_away, ground, address, kit, competition, our_score, their_score, result, motm) overriding system value values (106, 1, 'past', '2025-11-02', '11:00', '10:30', 'Blyth Town Colts', 'A', 'South Beach Recreation Ground', 'Links Rd, Blyth NE24 3PL', 'black', 'League', 2, 1, 'W', 6);
insert into fixtures (id, season_id, status, date, kickoff, meetup, opponent, home_away, ground, address, kit, competition, our_score, their_score, result, motm) overriding system value values (107, 1, 'past', '2025-11-16', '10:00', '09:30', 'Killingworth YPC', 'H', 'Harris Park, Pitch 3', 'Harris Park, Coast Rd, Newcastle NE28 9JA', 'gold', 'League', 3, 3, 'D', 10);
insert into fixtures (id, season_id, status, date, kickoff, meetup, opponent, home_away, ground, address, kit, competition, our_score, their_score, result, motm) overriding system value values (108, 1, 'past', '2025-11-30', '12:30', '12:00', 'Tynemouth Tigers', 'A', 'Preston Avenue Fields', 'Preston Ave, North Shields NE30 2BE', 'black', 'League', 4, 0, 'W', 9);
insert into fixtures (id, season_id, status, date, kickoff, meetup, opponent, home_away, ground, address, kit, competition, our_score, their_score, result, motm) overriding system value values (201, 1, 'upcoming', '2026-06-13', '10:00', '09:30', 'Wallsend Boys Club', 'H', 'Harris Park, Pitch 3', 'Harris Park, Coast Rd, Newcastle NE28 9JA', 'gold', 'League', null, null, null, null);
insert into fixtures (id, season_id, status, date, kickoff, meetup, opponent, home_away, ground, address, kit, competition, our_score, their_score, result, motm) overriding system value values (202, 1, 'upcoming', '2026-06-20', '11:30', '11:00', 'Cramlington Juniors', 'A', 'Beaconhill Sports Ground', 'Burnside, Cramlington NE23 6QP', 'black', 'League', null, null, null, null);
insert into fixtures (id, season_id, status, date, kickoff, meetup, opponent, home_away, ground, address, kit, competition, our_score, their_score, result, motm) overriding system value values (203, 1, 'upcoming', '2026-06-27', '10:00', '09:15', 'Ponteland United', 'H', 'Harris Park, Pitch 3', 'Harris Park, Coast Rd, Newcastle NE28 9JA', 'gold', 'Cup', null, null, null, null);
insert into fixtures (id, season_id, status, date, kickoff, meetup, opponent, home_away, ground, address, kit, competition, our_score, their_score, result, motm) overriding system value values (204, 1, 'upcoming', '2026-07-04', '10:30', '10:00', 'Gosforth Bohemians', 'H', 'Harris Park, Pitch 3', 'Harris Park, Coast Rd, Newcastle NE28 9JA', 'gold', 'League', null, null, null, null);
insert into fixtures (id, season_id, status, date, kickoff, meetup, opponent, home_away, ground, address, kit, competition, our_score, their_score, result, motm) overriding system value values (205, 1, 'upcoming', '2026-07-11', '12:00', '11:30', 'Whitley Bay Storm', 'A', 'Hillheads Park', 'Hillheads Rd, Whitley Bay NE25 8HR', 'black', 'League', null, null, null, null);
select setval(pg_get_serial_sequence('fixtures','id'), (select max(id) from fixtures));

-- GOALS
insert into goals (fixture_id, scorer, assist) values (101, 9, 7);
insert into goals (fixture_id, scorer, assist) values (101, 9, 10);
insert into goals (fixture_id, scorer, assist) values (101, 7, 8);
insert into goals (fixture_id, scorer, assist) values (101, 11, null);
insert into goals (fixture_id, scorer, assist) values (102, 7, 10);
insert into goals (fixture_id, scorer, assist) values (102, 10, 6);
insert into goals (fixture_id, scorer, assist) values (103, 7, 8);
insert into goals (fixture_id, scorer, assist) values (103, 7, 10);
insert into goals (fixture_id, scorer, assist) values (103, 11, 7);
insert into goals (fixture_id, scorer, assist) values (104, 9, 6);
insert into goals (fixture_id, scorer, assist) values (105, 7, 10);
insert into goals (fixture_id, scorer, assist) values (105, 9, 8);
insert into goals (fixture_id, scorer, assist) values (105, 9, 7);
insert into goals (fixture_id, scorer, assist) values (105, 10, 6);
insert into goals (fixture_id, scorer, assist) values (105, 15, 11);
insert into goals (fixture_id, scorer, assist) values (106, 11, 8);
insert into goals (fixture_id, scorer, assist) values (106, 8, 10);
insert into goals (fixture_id, scorer, assist) values (107, 9, 10);
insert into goals (fixture_id, scorer, assist) values (107, 10, 7);
insert into goals (fixture_id, scorer, assist) values (107, 7, 6);
insert into goals (fixture_id, scorer, assist) values (108, 9, 7);
insert into goals (fixture_id, scorer, assist) values (108, 9, 10);
insert into goals (fixture_id, scorer, assist) values (108, 7, 8);
insert into goals (fixture_id, scorer, assist) values (108, 6, 10);

-- ATTENDANCE
insert into attendance (fixture_id, player_id, status) values (201, 2, 'no');
insert into attendance (fixture_id, player_id, status) values (201, 4, 'yes');
insert into attendance (fixture_id, player_id, status) values (201, 6, 'yes');
insert into attendance (fixture_id, player_id, status) values (201, 7, 'yes');
insert into attendance (fixture_id, player_id, status) values (201, 9, 'yes');
insert into attendance (fixture_id, player_id, status) values (201, 10, 'maybe');
insert into attendance (fixture_id, player_id, status) values (202, 7, 'yes');
insert into attendance (fixture_id, player_id, status) values (202, 9, 'maybe');

-- TRAINING
insert into training_sessions (id, season_id, date, start, "end", location, focus, drills) overriding system value values (301, 1, '2026-06-09', '18:00', '19:15', 'Harris Park 3G Cage', 'Finishing & movement in the box', '["Rondo warm-up 5v2","Crossing & finishing circuit","Small-sided 4v4 to mini-goals","Penalty shootout challenge"]');
insert into training_sessions (id, season_id, date, start, "end", location, focus, drills) overriding system value values (302, 1, '2026-06-11', '18:00', '19:15', 'Harris Park 3G Cage', 'Playing out from the back', '["Passing diamond warm-up","Build-up patterns vs press","Defending 1v1 & 2v2","Conditioned game: 3 passes before shooting"]');
insert into training_sessions (id, season_id, date, start, "end", location, focus, drills) overriding system value values (303, 1, '2026-06-16', '18:00', '19:15', 'Harris Park 3G Cage', 'Pressing as a unit', '["Reaction sprints","Press triggers & cover shadows","Transition 4v4+2","Match scenario: win it back in 6 seconds"]');
insert into training_sessions (id, season_id, date, start, "end", location, focus, drills) overriding system value values (304, 1, '2026-06-18', '18:00', '19:15', 'Harris Park 3G Cage', '1v1 attacking & defending', '["Footwork ladder","1v1 gates dribbling","Defending the duel — jockey & tackle","King of the ring tournament"]');
select setval(pg_get_serial_sequence('training_sessions','id'), (select max(id) from training_sessions));

-- EVENTS
insert into events (id, season_id, title, description, location, date, img) overriding system value values (401, 1, 'End of Season Presentation Day', 'Trophies, medals, and our player-card reveal for every member of the squad. Families welcome — food and drinks provided. Let''s celebrate a brilliant season together!', 'Harris Park Clubhouse', '2026-07-19', 'trophy');
insert into events (id, season_id, title, description, location, date, img) overriding system value values (402, 1, 'Sponsored Penalty Shootout', 'Our big fundraiser! Each player gets sponsored per penalty scored. All money goes towards new training kit and tournament entry fees. Sponsor forms in the team chat.', 'Harris Park, Pitch 3', '2026-06-28', 'target');
insert into events (id, season_id, title, description, location, date, img) overriding system value values (403, 1, 'Team Day Out — Go Karting', 'A well-earned team day out to round off the summer. A chance for the boys to let off steam and build those friendships off the pitch.', 'Teesside Karting', '2026-08-02', 'flag');
insert into events (id, season_id, title, description, location, date, img) overriding system value values (404, 1, 'Summer Skills Camp', 'Three-day skills camp run by our coaches. Technical work, fun competitions and plenty of football. Open to the whole squad.', 'Harris Park', '2026-08-11', 'cone');
select setval(pg_get_serial_sequence('events','id'), (select max(id) from events));

-- GAME POINTS
insert into game_points (player_id, attendance, training, quiz, exercise, badges) values (7, 120, 96, 80, 60, '["streak10","quizace","motm4"]');
insert into game_points (player_id, attendance, training, quiz, exercise, badges) values (9, 120, 90, 60, 55, '["topscorer","motm4","hattrick"]');
insert into game_points (player_id, attendance, training, quiz, exercise, badges) values (6, 120, 98, 70, 50, '["streak10","captain"]');
insert into game_points (player_id, attendance, training, quiz, exercise, badges) values (10, 120, 88, 75, 45, '["playmaker","quizace"]');
insert into game_points (player_id, attendance, training, quiz, exercise, badges) values (4, 120, 92, 50, 40, '["wall","streak10"]');
insert into game_points (player_id, attendance, training, quiz, exercise, badges) values (8, 110, 84, 65, 50, '["playmaker"]');
insert into game_points (player_id, attendance, training, quiz, exercise, badges) values (2, 120, 80, 55, 48, '["streak10"]');
insert into game_points (player_id, attendance, training, quiz, exercise, badges) values (11, 100, 82, 45, 42, '[]');
insert into game_points (player_id, attendance, training, quiz, exercise, badges) values (5, 110, 86, 40, 38, '["wall"]');
insert into game_points (player_id, attendance, training, quiz, exercise, badges) values (1, 110, 90, 50, 35, '["goldengloves"]');
insert into game_points (player_id, attendance, training, quiz, exercise, badges) values (14, 90, 78, 48, 40, '[]');
insert into game_points (player_id, attendance, training, quiz, exercise, badges) values (3, 100, 80, 42, 36, '[]');
insert into game_points (player_id, attendance, training, quiz, exercise, badges) values (15, 80, 74, 38, 30, '[]');
insert into game_points (player_id, attendance, training, quiz, exercise, badges) values (12, 60, 70, 44, 28, '["goldengloves"]');

-- ===================================================================
-- OWFC Harris — bulk-load the curated academy videos into the Stock Library.
-- PREREQ: run supabase/migrate-directory-and-folders.sql first (adds drills.folder)
--         and have the stock-folders code deployed.
-- These load as STOCK (admin shelf): team=false, no children assigned, filed in a
-- folder. They stay admin-only until you assign them to the team or specific kids
-- in Admin → Videos → Stock. Run once in Supabase → SQL Editor.
-- ===================================================================
insert into drills (title, url, description, team, player_ids, folder) values
('5 Essential First Touch Drills', 'https://www.youtube.com/watch?v=JbOwpq_8CeM', 'Home practice', false, '[]'::jsonb, 'First touch'),
('First Touch Drills (U7-U9)', 'https://www.youtube.com/watch?v=Q7hROm8fMZ8', 'Team drill', false, '[]'::jsonb, 'First touch'),
('3 Simple Close Control Dribbling Drills', 'https://www.youtube.com/watch?v=rwWmH7pEjcQ', 'Home practice', false, '[]'::jsonb, 'Close control'),
('5 Close Control Dribbling Drills (small spaces)', 'https://www.youtube.com/watch?v=QqjaavLXdHs', 'Home practice', false, '[]'::jsonb, 'Close control'),
('Improve Your Close Control - 5 Exercises', 'https://www.youtube.com/watch?v=yowDWBngLSE', 'Team drill', false, '[]'::jsonb, 'Close control'),
('Ball Mastery / Toe Taps (U8-U12)', 'https://www.youtube.com/watch?v=KaktBhbJUyg', 'Home practice', false, '[]'::jsonb, 'Ball mastery'),
('5 Easy Sole Roll Mastery Skills', 'https://www.youtube.com/watch?v=SxI9PjFG_KQ', 'Home practice', false, '[]'::jsonb, 'Ball mastery'),
('How to Juggle a Soccer Ball for Beginners & Kids', 'https://www.youtube.com/watch?v=gYPb9AqtE7o', 'Home practice', false, '[]'::jsonb, 'Keepy-ups'),
('Learn How to Juggle - Basic Kick Ups', 'https://www.youtube.com/watch?v=_MIKVGfU3pw', 'Home practice', false, '[]'::jsonb, 'Keepy-ups'),
('Children''s Home Football Practice - Keepy Uppies', 'https://www.youtube.com/watch?v=WMwgXZnZqLw', 'Home practice', false, '[]'::jsonb, 'Keepy-ups'),
('5 Easy Soccer Moves for Kids and Beginners', 'https://www.youtube.com/watch?v=nt4ljHSzUfs', 'Home practice', false, '[]'::jsonb, 'Skill moves'),
('15 Easy Skill Moves for Beginners', 'https://www.youtube.com/watch?v=Xim8-lUZnsA', 'Home practice', false, '[]'::jsonb, 'Skill moves'),
('5 Easy Flick-Up Skills', 'https://www.youtube.com/watch?v=9TPXD3-kCfU', 'Home practice', false, '[]'::jsonb, 'Skill moves'),
('Learn Five Best 1v1 Skills', 'https://www.youtube.com/watch?v=TzSSqyfiLFM', 'Home practice', false, '[]'::jsonb, 'Dribbling & 1v1'),
('Pass & Move Drill (U9-U12)', 'https://www.youtube.com/watch?v=EDJKPs2Qcag', 'Team drill', false, '[]'::jsonb, 'Passing'),
('How to Coach Receiving on the Half Turn (8-13)', 'https://www.youtube.com/watch?v=bI8BXGpdido', 'Team drill', false, '[]'::jsonb, 'Half-turn'),
('Learn To: Receive on the Half-Turn', 'https://www.youtube.com/watch?v=I9D0iJxrvQU', 'Home practice', false, '[]'::jsonb, 'Half-turn'),
('Finishing Drill - 3 Variations (U10-U14)', 'https://www.youtube.com/watch?v=aqqeTGEkK9Q', 'Team drill', false, '[]'::jsonb, 'Shooting'),
('5 Essential Shooting Drills Kids Must Master', 'https://www.youtube.com/watch?v=CVF_qsuac6E', 'Home practice', false, '[]'::jsonb, 'Shooting'),
('7 Rules - Off the Ball Movement', 'https://www.youtube.com/watch?v=4nFN9L7yUk8', 'Home practice', false, '[]'::jsonb, 'Movement'),
('Teach Youth Players Off-Ball Movement', 'https://www.youtube.com/watch?v=eTkPSnY64fM', 'Team drill', false, '[]'::jsonb, 'Movement'),
('10 Best Soccer Defending Drills for Kids', 'https://www.youtube.com/watch?v=MDF6tB5foI0', 'Team drill', false, '[]'::jsonb, 'Defending'),
('3 Easy 1v1 Defending Drills', 'https://www.youtube.com/watch?v=sjHLU8CQkQw', 'Home practice', false, '[]'::jsonb, 'Defending'),
('Rotating 1v1 Defending Drill', 'https://www.youtube.com/watch?v=7bWP2Ygwm_o', 'Team drill', false, '[]'::jsonb, 'Defending'),
('How to Get Young Players to Scan Like a Pro', 'https://www.youtube.com/watch?v=b_Gebed7DPE', 'Team drill', false, '[]'::jsonb, 'Communication'),
('3 Ways to Improve Team Communication', 'https://www.youtube.com/watch?v=5DfBlFCU9FU', 'Team drill', false, '[]'::jsonb, 'Communication'),
('How to Coach Scanning (Vol 2)', 'https://www.youtube.com/watch?v=4Get6r03mFE', 'Team drill', false, '[]'::jsonb, 'Communication'),
('10x Fitness Games - Kids Workout', 'https://www.youtube.com/watch?v=q1tiNPiZcco', 'Home practice', false, '[]'::jsonb, 'Fitness'),
('3 Cone Drills - Youth Speed & Agility', 'https://www.youtube.com/watch?v=kohO8MIcM2M', 'Team drill', false, '[]'::jsonb, 'Fitness'),
('9 Essential Goalkeeping Skills', 'https://www.youtube.com/watch?v=k1i6kWXi2Ls', 'Team drill', false, '[]'::jsonb, 'Goalkeeping'),
('How to Position Correctly as a Goalkeeper', 'https://www.youtube.com/watch?v=RVSEYzcGaic', 'Home practice', false, '[]'::jsonb, 'Goalkeeping');

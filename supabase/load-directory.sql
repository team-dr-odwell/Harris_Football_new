-- ===================================================================
-- OWFC Harris — load opponent-manager Directory (for arranging friendlies).
-- Extracted from the Tandridge League fixture emails (2025/26 season).
-- PREREQ: run supabase/migrate-directory-and-folders.sql first (creates `directory`).
-- This clears any blank auto-seeded rows, then loads the populated contacts.
-- Run once in Supabase → SQL Editor.
-- ===================================================================
delete from directory where coalesce(manager, '') = '';

insert into directory (club, manager, phone, email, ground) values
('West Wickham Sky', 'Chris Webb', '07377944762', 'cfrw@talk21.com', 'West Wickham FC, Corkscrew Hill, West Wickham, Kent, BR4 9BB'),
('London Kickers FC Blue', 'Henzo Coimbra', '07399928886', 'henzocoimbra4444@gmail.com', 'Hawes Down Pitches, Hawes Lane, West Wickham, BR4 9AE'),
('Westerham Juniors Tigers', 'Nick McCluskie', '07885244490', 'nickmccluskie@yahoo.co.uk', 'King George''s Playing Fields, Brasted Road (A25), Westerham, Kent, TN16 1TD'),
('The Warren Tigers', 'John Waite', '07736282558', 'jjwaite10@me.com', null),
('Farnborough Old Boys Guild FC', 'Chris Allchorne', '07879075359', 'c.allchorne@gmail.com', null),
('Bromleians', 'Dan Baldock', '07816637755', 'baldockdan@gmail.com', 'Bromleians FC, The John Cooper Grounds, Lower Gravel Road, Bromley, Kent, BR2 8LL'),
('Orpington Town FC Jaguars', 'Junior Ezenna', '07767 921180', 'southjay99@gmail.com', null),
('Tulse Hill', 'James Lee', '07876 794262', 'james.lee@lewisham.gov.uk', null),
('Norbury Green FC', 'Howard Smith', '07506529103', 'h5star@hotmail.co.uk', null),
('Lewisham Tigers Reds', 'Chris Bird', '07730910345', 'chrisbird101@gmail.com', 'Downham Lower Fields, Glenbow Road, Bromley, Kent, BR1 4RL'),
('Penge Panthers', 'Dan Olney', '07970 331384', 'danolney3@gmail.com', 'Alexandra Junior School, Cator Road, Sydenham, London, SE26 5DS'),
('Beckenham Town JFC White', 'Craig Jacques', '07730 505554', 'jacques_200@hotmail.com', null),
('Chislehurst Glebe FC (Youth) Tigers', 'Valentin Gerasimuk', '07552705780', 'valentin.gerasimuk@gmail.com', 'Glebe FC, Foxbury Avenue, Chislehurst, Kent, BR7 6SD'),
('Forestdale Blacks', 'Calvin Headley', '07305134632', 'calvinheadley3@gmail.com', null),
('AFC Shortlands Hurricanes', 'Marcia King', '07733103183', 'marciaking79@gmail.com', 'Queensmead Recreation Ground, Glassmill Lane, Bromley, Kent, BR2 0EY'),
('Petts Wood Ravens', 'Stuart Smith', '07971383506', 'stuart.smith@hepctrust.org.uk', 'Petts Wood FC, Barnet Wood Road, Hayes, Bromley, Kent, BR2 7AA'),
('Petts Wood Redshanks', 'Adam Hall', '07949386084', 'adampwhall@gmail.com', 'Petts Wood FC, Barnet Wood Road, Hayes, Bromley, Kent, BR2 7AA'),
('Selsdon Junior Tigers', 'Gavin Wilmot', '07789 102260', 'gavin.wilmot@gmail.com', 'Croydon Postal Ground, Trenham Drive, Warlingham, Surrey, CR6 9RU'),
('Selsdon Junior Eagles', 'Lee Chacksfield', '07771 645744', 'leechacksfield@hotmail.com', 'Croydon Postal Ground, Trenham Drive, Warlingham, Surrey, CR6 9RU'),
('Beckenham United FC Hawks', 'Gabriel Afful', '07428801919', 'gabrielafful803@gmail.com', null),
('Moving Matters FC Bears', 'Dean Potter', '07912 860931', 'deanjaye18@gmail.com', 'Tooting Common, Doctor Johnson Avenue, Tooting, London, SW17 8JJ');

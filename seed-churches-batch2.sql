-- Batch 2: Additional 50 Churches Across South Africa
-- Run this in Supabase SQL Editor

INSERT INTO churches (name, denomination, address, city, province, lat, lng, website, phone, slug, verified) VALUES

-- Cape Town (15 more)
('Lighthouse Baptist Church', 'Baptist', '27 Waterloo Rd, Wynberg', 'Cape Town', 'Western Cape', -34.0027, 18.4637, 'https://www.lighthousebaptist.org.za/', '021 761 4142', 'lighthouse-baptist-church-wynberg', TRUE),
('Living Hope Church', 'Non-Denominational', '48 Camp Ground Rd, Rondebosch', 'Cape Town', 'Western Cape', -33.9568, 18.4697, 'https://www.livinghope.org.za/', '021 689 9902', 'living-hope-church-rondebosch', TRUE),
('Mowbray Baptist Church', 'Baptist', 'Belmont Rd, Observatory', 'Cape Town', 'Western Cape', -33.9393, 18.4692, NULL, '021 447 5033', 'mowbray-baptist-church', TRUE),
('Salt River Baptist Church', 'Baptist', 'Rosmead Ave, Salt River', 'Cape Town', 'Western Cape', -33.9331, 18.4481, NULL, '021 447 1270', 'salt-river-baptist-church', TRUE),
('Gardens Methodist Church', 'Methodist', 'Mill St, Gardens', 'Cape Town', 'Western Cape', -33.9329, 18.4157, NULL, '021 461 4959', 'gardens-methodist-church', TRUE),
('Newlands Methodist Church', 'Methodist', 'Main Rd, Newlands', 'Cape Town', 'Western Cape', -33.9720, 18.4503, NULL, '021 689 3093', 'newlands-methodist-church', TRUE),
('Christ Church Constantia', 'Anglican', 'Spaanschemat River Rd, Constantia', 'Cape Town', 'Western Cape', -34.0310, 18.4334, 'https://www.christchurchconstantia.org/', '021 794 2323', 'christ-church-constantia', TRUE),
('St Thomas Anglican Church', 'Anglican', 'Main Rd, Rondebosch', 'Cape Town', 'Western Cape', -33.9602, 18.4681, NULL, '021 689 3104', 'st-thomas-rondebosch', TRUE),
('Holy Trinity Kalk Bay', 'Anglican', 'Main Rd, Kalk Bay', 'Cape Town', 'Western Cape', -34.1289, 18.4488, NULL, '021 788 1806', 'holy-trinity-kalk-bay', TRUE),
('Grace Church Tokai', 'Non-Denominational', 'Spaanschemat River Rd, Tokai', 'Cape Town', 'Western Cape', -34.0636, 18.4503, 'https://www.gracechurchtokai.co.za/', '021 712 7100', 'grace-church-tokai', TRUE),
('Apostolic Faith Mission Bellville', 'Pentecostal', 'Voortrekker Rd, Bellville', 'Cape Town', 'Western Cape', -33.9020, 18.6235, NULL, '021 949 4412', 'afm-bellville', TRUE),
('Pinelands Methodist Church', 'Methodist', 'Ringwood Dr, Pinelands', 'Cape Town', 'Western Cape', -33.9411, 18.5004, NULL, '021 531 1530', 'pinelands-methodist-church', TRUE),
('Good Hope Baptist Church', 'Baptist', 'Roeland St, Cape Town CBD', 'Cape Town', 'Western Cape', -33.9285, 18.4221, NULL, '021 461 6269', 'good-hope-baptist-church', TRUE),
('Mitchells Plain Community Church', 'Non-Denominational', 'AZ Berman Dr, Mitchells Plain', 'Cape Town', 'Western Cape', -34.0527, 18.6189, NULL, '021 372 3661', 'mitchells-plain-community-church', TRUE),
('Athlone Methodist Church', 'Methodist', 'Protea Rd, Athlone', 'Cape Town', 'Western Cape', -33.9661, 18.5070, NULL, '021 696 1878', 'athlone-methodist-church', TRUE),

-- Johannesburg / Gauteng (20 more)
('Central Baptist Church Johannesburg', 'Baptist', '65 Juta St, Braamfontein', 'Johannesburg', 'Gauteng', -26.1929, 28.0377, 'https://www.cbcjhb.co.za/', '011 403 1653', 'central-baptist-jhb', TRUE),
('St Mary''s Cathedral Johannesburg', 'Catholic', '78 End St, Doornfontein', 'Johannesburg', 'Gauteng', -26.1943, 28.0631, 'https://www.stmaryscathedral.org.za/', '011 402 6400', 'st-marys-cathedral-jhb', TRUE),
('Johannesburg Christian Centre', 'Non-Denominational', 'Tonetti St, Bez Valley', 'Johannesburg', 'Gauteng', -26.1802, 28.0843, NULL, '011 616 1798', 'johannesburg-christian-centre', TRUE),
('Victory Church Sandton', 'Pentecostal', 'Benmore Shopping Centre, Sandton', 'Johannesburg', 'Gauteng', -26.0928, 28.0589, 'https://www.victory.org.za/', '011 783 2360', 'victory-church-sandton', TRUE),
('Sandton Methodist Church', 'Methodist', 'Rivonia Rd, Sandton', 'Johannesburg', 'Gauteng', -26.1076, 28.0552, NULL, '011 783 7464', 'sandton-methodist-church', TRUE),
('Johannesburg Baptist Church', 'Baptist', 'Kings Rd, Parktown', 'Johannesburg', 'Gauteng', -26.1829, 28.0397, NULL, '011 643 6904', 'johannesburg-baptist-church', TRUE),
('Christ Church Hillbrow', 'Anglican', 'Twist St, Hillbrow', 'Johannesburg', 'Gauteng', -26.1884, 28.0475, NULL, '011 643 6505', 'christ-church-hillbrow', TRUE),
('Northcliff Baptist Church', 'Baptist', 'Pendoring Rd, Northcliff', 'Johannesburg', 'Gauteng', -26.1439, 27.9695, NULL, '011 478 1815', 'northcliff-baptist-church', TRUE),
('Fourways Community Church', 'Non-Denominational', 'William Nicol Dr, Fourways', 'Johannesburg', 'Gauteng', -26.0194, 28.0100, NULL, '011 465 5183', 'fourways-community-church', TRUE),
('NG Kerk Lyttelton', 'Dutch Reformed', 'Rautenbach St, Lyttelton', 'Pretoria', 'Gauteng', -25.8388, 28.1885, NULL, '012 664 0130', 'ng-kerk-lyttelton', TRUE),
('Brooklyn Baptist Church', 'Baptist', 'Duncan St, Brooklyn', 'Pretoria', 'Gauteng', -25.7632, 28.2344, 'https://www.brooklynbaptist.co.za/', '012 346 2904', 'brooklyn-baptist-church', TRUE),
('Pretoria East Methodist Church', 'Methodist', 'Lynnwood Rd, Menlo Park', 'Pretoria', 'Gauteng', -25.7675, 28.2806, NULL, '012 348 3393', 'pretoria-east-methodist', TRUE),
('Menlo Park Baptist Church', 'Baptist', 'Atterbury Rd, Menlo Park', 'Pretoria', 'Gauteng', -25.7850, 28.2756, 'https://www.menlopark.co.za/', '012 348 1633', 'menlo-park-baptist-church', TRUE),
('His People Church Pretoria', 'Pentecostal', 'Lavender Rd, Centurion', 'Pretoria', 'Gauteng', -25.8607, 28.1885, NULL, '012 663 7312', 'his-people-pretoria', TRUE),
('Centurion Methodist Church', 'Methodist', 'Hendrik Verwoerd Dr, Centurion', 'Pretoria', 'Gauteng', -25.8608, 28.1885, NULL, '012 663 2939', 'centurion-methodist-church', TRUE),
('NG Kerk Eersterust', 'Dutch Reformed', 'Eeufees Rd, Eersterust', 'Pretoria', 'Gauteng', -25.7291, 28.2781, NULL, '012 373 5020', 'ng-kerk-eersterust', TRUE),
('Grace Presbyterian Church Pretoria', 'Presbyterian', 'Paul Kruger St, Pretoria CBD', 'Pretoria', 'Gauteng', -25.7479, 28.1884, NULL, '012 322 6602', 'grace-presbyterian-pretoria', TRUE),
('Sunnyside Methodist Church', 'Methodist', 'Charles St, Sunnyside', 'Pretoria', 'Gauteng', -25.7477, 28.2047, NULL, '012 341 3241', 'sunnyside-methodist-church', TRUE),
('Mamelodi Baptist Church', 'Baptist', 'Tsamaya Ave, Mamelodi', 'Pretoria', 'Gauteng', -25.7076, 28.3653, NULL, '012 803 8136', 'mamelodi-baptist-church', TRUE),
('NG Kerk Magnolia Dell', 'Dutch Reformed', 'Garsfontein Rd, Pretoria', 'Pretoria', 'Gauteng', -25.8128, 28.3134, NULL, '012 998 5211', 'ng-kerk-magnolia-dell', TRUE),

-- Durban / KZN (8 more)
('Emmanuel Cathedral Durban', 'Catholic', 'Emmanuel Rd, Durban', 'Durban', 'KwaZulu-Natal', -29.8528, 31.0131, 'https://www.emmanuelcathedral.co.za/', '031 305 2549', 'emmanuel-cathedral-durban', TRUE),
('Pinetown Baptist Church', 'Baptist', 'Stapleton Rd, Pinetown', 'Durban', 'KwaZulu-Natal', -29.8134, 30.8649, NULL, '031 702 4512', 'pinetown-baptist-church', TRUE),
('Hillcrest Baptist Church', 'Baptist', 'Old Main Rd, Hillcrest', 'Durban', 'KwaZulu-Natal', -29.7688, 30.7698, 'https://www.hillcrestbaptist.co.za/', '031 765 2319', 'hillcrest-baptist-church', TRUE),
('Berea Baptist Church', 'Baptist', 'Musgrave Rd, Berea', 'Durban', 'KwaZulu-Natal', -29.8485, 31.0127, NULL, '031 201 4363', 'berea-baptist-church', TRUE),
('Glenwood Methodist Church', 'Methodist', 'Moore Rd, Glenwood', 'Durban', 'KwaZulu-Natal', -29.8729, 30.9824, NULL, '031 201 5648', 'glenwood-methodist-church', TRUE),
('Kloof Methodist Church', 'Methodist', 'Village Rd, Kloof', 'Durban', 'KwaZulu-Natal', -29.7877, 30.8283, NULL, '031 764 2474', 'kloof-methodist-church', TRUE),
('Gateway Community Church Umhlanga', 'Non-Denominational', 'Chartwell Dr, Umhlanga', 'Durban', 'KwaZulu-Natal', -29.7277, 31.0764, NULL, '031 566 0668', 'gateway-community-umhlanga', TRUE),
('Pietermaritzburg Methodist Church', 'Methodist', 'Church St, Pietermaritzburg', 'Pietermaritzburg', 'KwaZulu-Natal', -29.6007, 30.3794, NULL, '033 345 4363', 'pietermaritzburg-methodist', TRUE),

-- Other Cities (7 more)
('Port Elizabeth Baptist Church', 'Baptist', 'Whites Rd, Port Elizabeth', 'Port Elizabeth', 'Eastern Cape', -33.9609, 25.6022, NULL, '041 373 2807', 'port-elizabeth-baptist-church', TRUE),
('St Mary''s Cathedral East London', 'Catholic', 'Pearce St, East London', 'East London', 'Eastern Cape', -33.0158, 27.9116, NULL, '043 722 4141', 'st-marys-cathedral-east-london', TRUE),
('Grey Street Methodist Church Bloemfontein', 'Methodist', 'Grey St, Bloemfontein', 'Bloemfontein', 'Free State', -29.1167, 26.2142, NULL, '051 430 1303', 'grey-street-methodist-bloemfontein', TRUE),
('Kimberley Baptist Church', 'Baptist', 'Du Toitspan Rd, Kimberley', 'Kimberley', 'Northern Cape', -28.7325, 24.7621, NULL, '053 832 1625', 'kimberley-baptist-church', TRUE),
('St Peter''s Church Polokwane', 'Anglican', 'Church St, Polokwane', 'Polokwane', 'Limpopo', -23.9012, 29.4545, NULL, '015 295 3011', 'st-peters-polokwane', TRUE),
('Nelspruit Community Church', 'Non-Denominational', 'Nel St, Nelspruit', 'Nelspruit', 'Mpumalanga', -25.4745, 30.9703, NULL, '013 755 3631', 'nelspruit-community-church', TRUE),
('Rustenburg Baptist Church', 'Baptist', 'Boom St, Rustenburg', 'Rustenburg', 'North West', -25.6673, 27.2423, NULL, '014 592 1181', 'rustenburg-baptist-church', TRUE);

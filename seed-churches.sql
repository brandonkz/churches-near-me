-- Additional South African Churches
-- Run this in Supabase SQL Editor to add more churches

INSERT INTO churches (name, denomination, address, city, province, lat, lng, website, phone, slug, verified) VALUES

-- Cape Town
('St Mary''s Cathedral', 'Catholic', '104 Bouquet St, Gardens', 'Cape Town', 'Western Cape', -33.9351, 18.4181, 'https://www.stmaryscathedral.co.za/', '021 461 1167', 'st-marys-cathedral-cape-town', TRUE),
('Claremont Baptist Church', 'Baptist', '8 Protea Rd, Claremont', 'Cape Town', 'Western Cape', -33.9854, 18.4638, 'https://www.claremontbaptist.co.za/', '021 683 2344', 'claremont-baptist-church', TRUE),
('Sea Point Methodist Church', 'Methodist', '4 St Johns Rd, Sea Point', 'Cape Town', 'Western Cape', -33.9236, 18.3858, 'https://www.seapointmethodist.org.za/', '021 434 3726', 'sea-point-methodist-church', TRUE),
('Victory Church Constantia', 'Pentecostal', 'Constantia Village Shopping Centre', 'Cape Town', 'Western Cape', -34.0247, 18.4284, 'https://www.victory.org.za/', '021 794 5050', 'victory-church-constantia', TRUE),
('Rhema Bible Church Cape Town', 'Pentecostal', '61 De Villiers Dr, Bellville', 'Cape Town', 'Western Cape', -33.8967, 18.6317, 'https://www.rhemacapetown.co.za/', '021 948 7729', 'rhema-bible-church-cape-town', TRUE),
('NG Kerk Stellenbosch', 'Dutch Reformed', 'Die Braak, Stellenbosch', 'Stellenbosch', 'Western Cape', -33.9344, 18.8599, 'https://www.ngstellenbosch.co.za/', '021 887 0495', 'ng-kerk-stellenbosch-moeder', TRUE),
('Belhar Congregation', 'Dutch Reformed', 'Symphony Way, Belhar', 'Cape Town', 'Western Cape', -33.9572, 18.6283, NULL, '021 951 8129', 'belhar-congregation', TRUE),
('Christ Church Kenilworth', 'Anglican', 'Rosmead Ave, Kenilworth', 'Cape Town', 'Western Cape', -33.9942, 18.4669, 'https://www.christchurchkenilworth.org.za/', '021 761 5881', 'christ-church-kenilworth', TRUE),

-- Johannesburg / Gauteng
('Bryanston Methodist Church', 'Methodist', 'Main Rd, Bryanston', 'Johannesburg', 'Gauteng', -26.0659, 28.0203, 'https://www.bryanstonmethodist.co.za/', '011 706 1509', 'bryanston-methodist-church', TRUE),
('Rhema Bible Church Randburg', 'Pentecostal', '173 Witkoppen Rd, Paulshof', 'Johannesburg', 'Gauteng', -26.0438, 28.0614, 'https://www.rhema.co.za/', '011 799 9000', 'rhema-bible-church-randburg', TRUE),
('Doxa Deo Church Silverlakes', 'Non-Denominational', 'Silverlakes Shopping Centre, Pretoria', 'Pretoria', 'Gauteng', -25.7457, 28.3372, 'https://www.doxadeo.co.za/', '012 809 3355', 'doxa-deo-silverlakes', TRUE),
('Grace Bible Church Soweto', 'Non-Denominational', 'Chris Hani Rd, Soweto', 'Johannesburg', 'Gauteng', -26.2499, 27.8540, 'https://www.gracebiblechurch.co.za/', '011 938 7336', 'grace-bible-church-soweto', TRUE),
('Hatfield Christian Church', 'Non-Denominational', 'Burnett St, Hatfield', 'Pretoria', 'Gauteng', -25.7497, 28.2371, 'https://www.hatfieldchurch.co.za/', '012 362 1390', 'hatfield-christian-church', TRUE),
('NG Kerk Moreleta Park', 'Dutch Reformed', 'Rubenstein Dr, Pretoria', 'Pretoria', 'Gauteng', -25.8202, 28.2718, 'https://www.moreleta.co.za/', '012 997 0804', 'ng-kerk-moreleta-park', TRUE),
('His People Church Randburg', 'Pentecostal', 'Cnr Republic & Malibongwe, Randburg', 'Johannesburg', 'Gauteng', -26.0975, 27.9826, 'https://www.hispeople.co.za/', '011 792 5777', 'his-people-church-randburg', TRUE),

-- Durban / KZN
('St Paul''s Church Durban', 'Anglican', '12 Masonic Grove, Durban', 'Durban', 'KwaZulu-Natal', -29.8597, 31.0218, 'https://www.stpaulsdurban.co.za/', '031 303 3753', 'st-pauls-church-durban', TRUE),
('Durban Christian Centre', 'Pentecostal', 'Peter Mokaba Ridge, Durban', 'Durban', 'KwaZulu-Natal', -29.8417, 30.9868, 'https://www.dcc.co.za/', '031 202 7277', 'durban-christian-centre', TRUE),
('Grace Family Church Ballito', 'Non-Denominational', 'Ballito Junction, Ballito', 'Ballito', 'KwaZulu-Natal', -29.5393, 31.2134, 'https://www.gracefamily.co.za/', '032 946 1151', 'grace-family-church-ballito', TRUE),
('Westville Methodist Church', 'Methodist', 'Jan Hofmeyr Rd, Westville', 'Durban', 'KwaZulu-Natal', -29.8302, 30.9283, NULL, '031 266 6270', 'westville-methodist-church', TRUE),

-- Other Provinces
('NG Kerk Bloemfontein', 'Dutch Reformed', 'President Brand St, Bloemfontein', 'Bloemfontein', 'Free State', -29.1211, 26.2157, 'https://www.ngkerkbloemfontein.co.za/', '051 447 3608', 'ng-kerk-bloemfontein', TRUE),
('St Mary''s Cathedral Port Elizabeth', 'Catholic', 'Westbourne Rd, Port Elizabeth', 'Port Elizabeth', 'Eastern Cape', -33.9608, 25.6022, NULL, '041 373 1641', 'st-marys-cathedral-pe', TRUE),
('Bethesda Full Gospel Church Polokwane', 'Pentecostal', 'Hans van Rensburg St, Polokwane', 'Polokwane', 'Limpopo', -23.9045, 29.4689, NULL, '015 297 3114', 'bethesda-full-gospel-polokwane', TRUE);

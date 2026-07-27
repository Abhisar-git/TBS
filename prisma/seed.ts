// ============================================================
// TBS — Seed Script (Delhi, India)
// Generates realistic demo data: 1 event (Bharat Mandapam),
// 4 accommodations, 15 drivers, 50 guests, and sample trips
// ============================================================

import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';
import { DELHI_LOCATIONS } from '../src/lib/maps/locations';

const prisma = new PrismaClient();

const VEHICLE_MODELS = [
  'Toyota Innova Crysta', 'Mahindra XUV700', 'Hyundai Creta',
  'Toyota Fortuner', 'MG Hector Plus', 'Kia Carens',
  'Maruti Ertiga', 'Toyota Camry', 'Hyundai Tucson',
  'Tata Safari', 'Mahindra Scorpio-N', 'Honda City',
  'Skoda Kushaq', 'Volkswagen Virtus', 'Hyundai Verna',
];

const FIRST_NAMES = [
  'Aarav', 'Vivaan', 'Aditya', 'Vihaan', 'Arjun', 'Reyansh', 'Sai',
  'Arnav', 'Dhruv', 'Kabir', 'Ananya', 'Diya', 'Aisha', 'Myra',
  'Sara', 'Aadhya', 'Ira', 'Kiara', 'Riya', 'Priya', 'Neha',
  'Rahul', 'Amit', 'Vikram', 'Suresh', 'Rajesh', 'Pooja', 'Sneha',
  'Kiran', 'Deepak', 'Manish', 'Rohit', 'Sanjay', 'Meera', 'Kavita',
  'Nandini', 'Shreya', 'Tanvi', 'Ishaan', 'Rohan', 'Kartik', 'Varun',
  'Nikhil', 'Prashant', 'Gayatri', 'Lakshmi', 'Harini', 'Divya', 'Akash', 'Pranav',
];

const LAST_NAMES = [
  'Sharma', 'Patel', 'Kumar', 'Singh', 'Reddy', 'Gupta', 'Iyer',
  'Nair', 'Joshi', 'Mehta', 'Shah', 'Desai', 'Rao', 'Pillai',
  'Mishra', 'Verma', 'Malhotra', 'Agarwal', 'Bhat', 'Chopra',
];

const DRIVER_NAMES = [
  'Rajesh Kumar', 'Satish Sharma', 'Gurpreet Singh', 'Balwan Singh', 'Dharmendra Yadav',
  'Sanjeev Verma', 'Ramesh Chand', 'Kuldeep Saini', 'Virender Tomar', 'Jasbir Gill',
  'Manoj Tyagi', 'Mukesh Pal', 'Deepak Choudhary', 'Hardeep Singh', 'Naresh Kumar',
];

const FLIGHT_NUMBERS = [
  'AI-801', '6E-205', 'UK-944', 'SG-817', 'AI-402',
  '6E-5321', 'UK-812', 'SG-298', 'AI-102', '6E-611',
  'QR-578', 'EK-513', 'SQ-401', 'LH-760', 'BA-256',
];

const TRAIN_NUMBERS = [
  '12004 NDLS Vande Bharat', '12423 Rajdhani Express', '12058 Jan Shatabdi',
  '12615 Grand Trunk Express', '12951 NDLS Rajdhani',
];

function randomElement<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

function randomInt(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function generatePhone(): string {
  return `+91 ${randomInt(90000, 99999)}${randomInt(10000, 99999)}`;
}

function generateVehicleNumber(): string {
  const states = ['DL', 'HR', 'UP'];
  const state = randomElement(states);
  return `${state} ${randomInt(1, 12).toString().padStart(2, '0')} ${String.fromCharCode(65 + randomInt(0, 25))}${String.fromCharCode(65 + randomInt(0, 25))} ${randomInt(1000, 9999)}`;
}

async function main() {
  console.log('🌱 Seeding TBS database with Delhi event data...\n');

  // Clear existing data in correct sequence
  console.log('🧹 Clearing existing data...');
  await prisma.locationHistory.deleteMany();
  await prisma.notification.deleteMany();
  await prisma.distanceCache.deleteMany();
  await prisma.rideRequest.deleteMany();
  await prisma.tripPassenger.deleteMany();
  await prisma.trip.deleteMany();
  await prisma.guestProfile.deleteMany();
  await prisma.driverProfile.deleteMany();
  await prisma.user.deleteMany();
  await prisma.accommodation.deleteMany();
  await prisma.event.deleteMany();

  // 1. Create Event (Delhi - Bharat Mandapam)
  console.log('🎪 Creating Delhi event...');
  const eventDate = new Date();
  eventDate.setDate(eventDate.getDate() + 1); // Tomorrow
  eventDate.setHours(9, 0, 0, 0);

  const eventEnd = new Date(eventDate);
  eventEnd.setHours(18, 0, 0, 0);

  await prisma.event.create({
    data: {
      name: 'Global Business Summit Delhi 2026',
      venueAddress: DELHI_LOCATIONS.venue.address,
      venueLat: DELHI_LOCATIONS.venue.lat,
      venueLng: DELHI_LOCATIONS.venue.lng,
      eventStart: eventDate,
      eventEnd: eventEnd,
      schedule: JSON.stringify([
        { id: '1', title: 'Guest Arrivals & Hotel Transfer', startTime: eventDate.toISOString(), endTime: new Date(eventDate.getTime() - 2 * 60 * 60 * 1000).toISOString(), tripType: 'ARRIVAL' },
        { id: '2', title: 'Morning Transfer to Bharat Mandapam', startTime: eventDate.toISOString(), endTime: new Date(eventDate.getTime() + 1 * 60 * 60 * 1000).toISOString(), tripType: 'TO_VENUE' },
        { id: '3', title: 'Evening Return to Hotels', startTime: eventEnd.toISOString(), endTime: new Date(eventEnd.getTime() + 2 * 60 * 60 * 1000).toISOString(), tripType: 'FROM_VENUE' },
        { id: '4', title: 'Airport & Station Departures', startTime: new Date(eventEnd.getTime() + 2 * 60 * 60 * 1000).toISOString(), endTime: new Date(eventEnd.getTime() + 6 * 60 * 60 * 1000).toISOString(), tripType: 'DEPARTURE' },
      ]),
    },
  });

  // 2. Create Accommodations (Delhi)
  console.log('🏨 Creating Delhi accommodations...');
  const accommodations = [];
  for (const acc of DELHI_LOCATIONS.accommodations) {
    const created = await prisma.accommodation.create({
      data: {
        name: acc.name,
        address: acc.address,
        lat: acc.lat,
        lng: acc.lng,
      },
    });
    accommodations.push(created);
  }

  // 3. Create Admin User
  console.log('👑 Creating admin user...');
  const adminHash = await bcrypt.hash('admin123', 12);
  await prisma.user.create({
    data: {
      name: 'Delhi Ops Admin',
      email: 'admin@tbs.event',
      phone: '+91 98100 12345',
      passwordHash: adminHash,
      role: 'ADMIN',
    },
  });

  // 4. Create Drivers (Delhi fleet)
  console.log('🚗 Creating 15 drivers...');
  const driverHash = await bcrypt.hash('driver123', 12);
  const drivers = [];

  for (let i = 0; i < 15; i++) {
    const model = VEHICLE_MODELS[i];
    const isLargeVehicle = ['Toyota Innova Crysta', 'Mahindra XUV700', 'Toyota Fortuner', 'MG Hector Plus', 'Kia Carens', 'Tata Safari', 'Mahindra Scorpio-N', 'Maruti Ertiga'].includes(model);

    // Spread driver positions across Delhi (near airport, railway stations, venue, and hotels)
    const baseLoc = i < 4
      ? DELHI_LOCATIONS.airport
      : i < 8
      ? DELHI_LOCATIONS.accommodations[i % DELHI_LOCATIONS.accommodations.length]
      : DELHI_LOCATIONS.venue;

    const driver = await prisma.user.create({
      data: {
        name: DRIVER_NAMES[i],
        email: `driver${i + 1}@tbs.event`,
        phone: generatePhone(),
        passwordHash: driverHash,
        role: 'DRIVER',
        driverProfile: {
          create: {
            vehicleNumber: generateVehicleNumber(),
            vehicleModel: model,
            seatCapacity: isLargeVehicle ? randomInt(5, 7) : randomInt(3, 4),
            luggageCapacity: isLargeVehicle ? randomInt(4, 6) : randomInt(2, 3),
            status: i < 12 ? 'AVAILABLE' : 'OFFLINE',
            currentLat: baseLoc.lat + (Math.random() - 0.5) * 0.03,
            currentLng: baseLoc.lng + (Math.random() - 0.5) * 0.03,
            locationUpdatedAt: new Date(),
          },
        },
      },
      include: { driverProfile: true },
    });
    drivers.push(driver);
  }

  // 5. Create Guests (50 attendees)
  console.log('👥 Creating 50 guests...');
  const guestHash = await bcrypt.hash('guest123', 12);
  const usedNames = new Set<string>();

  for (let i = 0; i < 50; i++) {
    let fullName: string;
    do {
      fullName = `${FIRST_NAMES[i % FIRST_NAMES.length]} ${randomElement(LAST_NAMES)}`;
    } while (usedNames.has(fullName));
    usedNames.add(fullName);

    const accommodation = randomElement(accommodations);
    const isFlying = Math.random() > 0.3; // 70% arrive by flight at IGI T3
    const arrivalHoursBeforeEvent = randomInt(2, 24);
    const arrivalTime = new Date(eventDate.getTime() - arrivalHoursBeforeEvent * 60 * 60 * 1000);
    const departureHoursAfterEvent = randomInt(2, 12);
    const departureTime = new Date(eventEnd.getTime() + departureHoursAfterEvent * 60 * 60 * 1000);

    const pickupPoint = isFlying
      ? DELHI_LOCATIONS.airport.address
      : randomElement(DELHI_LOCATIONS.stations).address;
    const groupSize = Math.random() > 0.8 ? randomInt(2, 4) : 1;
    const luggageCount = groupSize + (Math.random() > 0.5 ? 1 : 0);

    let status = 'REGISTERED';
    if (i < 10) status = 'ARRIVED';
    else if (i < 15) status = 'WAITING';
    else if (i < 20) status = 'ASSIGNED';

    await prisma.user.create({
      data: {
        name: fullName,
        email: `guest${i + 1}@tbs.event`,
        phone: generatePhone(),
        passwordHash: guestHash,
        role: 'GUEST',
        guestProfile: {
          create: {
            flightOrTrainNumber: isFlying ? randomElement(FLIGHT_NUMBERS) : randomElement(TRAIN_NUMBERS),
            arrivalEta: arrivalTime,
            departureEta: departureTime,
            pickupPoint,
            accommodationId: accommodation.id,
            groupSize,
            luggageCount,
            status,
          },
        },
      },
    });
  }

  // 6. Create Sample Completed & Active Trips
  console.log('🚕 Creating sample Delhi trips...');

  // Completed trips
  for (let i = 0; i < 4; i++) {
    const driverProfile = drivers[i].driverProfile!;
    const guests = await prisma.guestProfile.findMany({
      where: { status: 'ARRIVED' },
      take: randomInt(1, 2),
      skip: i * 2,
    });

    if (guests.length === 0) continue;

    const acc = accommodations[i % accommodations.length];
    await prisma.trip.create({
      data: {
        tripType: 'ARRIVAL',
        driverId: driverProfile.id,
        pickupAddress: DELHI_LOCATIONS.airport.address,
        pickupLat: DELHI_LOCATIONS.airport.lat,
        pickupLng: DELHI_LOCATIONS.airport.lng,
        dropoffAddress: acc.address,
        dropoffLat: acc.lat,
        dropoffLng: acc.lng,
        scheduledPickupTime: new Date(Date.now() - (i + 1) * 60 * 60 * 1000),
        actualPickupTime: new Date(Date.now() - (i + 1) * 60 * 60 * 1000 + 5 * 60 * 1000),
        actualDropoffTime: new Date(Date.now() - i * 60 * 60 * 1000),
        status: 'COMPLETED',
        estimatedDurationSec: randomInt(1800, 3000),
        actualDurationSec: randomInt(2100, 3300),
        distanceKm: randomInt(15, 25),
        passengers: {
          create: guests.map(g => ({
            guestProfileId: g.id,
            boardingStatus: 'DROPPED_OFF',
          })),
        },
      },
    });
  }

  // Active trips
  const activeStatuses = ['DRIVER_EN_ROUTE', 'DRIVER_ARRIVED', 'IN_PROGRESS'];
  for (let i = 0; i < 3; i++) {
    const driverProfile = drivers[i + 4].driverProfile!;
    const guestsForTrip = await prisma.guestProfile.findMany({
      where: { status: 'ASSIGNED' },
      take: 1,
      skip: i,
    });

    if (guestsForTrip.length === 0) continue;

    const acc = accommodations[i % accommodations.length];
    await prisma.trip.create({
      data: {
        tripType: 'ARRIVAL',
        driverId: driverProfile.id,
        pickupAddress: DELHI_LOCATIONS.airport.address,
        pickupLat: DELHI_LOCATIONS.airport.lat,
        pickupLng: DELHI_LOCATIONS.airport.lng,
        dropoffAddress: acc.address,
        dropoffLat: acc.lat,
        dropoffLng: acc.lng,
        scheduledPickupTime: new Date(),
        status: activeStatuses[i],
        estimatedDurationSec: randomInt(1800, 3000),
        distanceKm: randomInt(15, 25),
        passengers: {
          create: guestsForTrip.map(g => ({
            guestProfileId: g.id,
            boardingStatus: i === 2 ? 'BOARDED' : 'WAITING',
          })),
        },
      },
    });

    await prisma.driverProfile.update({
      where: { id: driverProfile.id },
      data: { status: i === 2 ? 'ON_TRIP' : 'EN_ROUTE' },
    });
  }

  // Pending ride requests
  console.log('📝 Creating sample ride requests...');
  const waitingGuests = await prisma.guestProfile.findMany({
    where: { status: 'WAITING' },
    take: 3,
  });

  for (const guest of waitingGuests) {
    await prisma.rideRequest.create({
      data: {
        guestProfileId: guest.id,
        pickupPoint: DELHI_LOCATIONS.airport.address,
        dropoffPoint: randomElement(accommodations).address,
        status: 'PENDING',
      },
    });
  }

  // Print summary
  const userCount = await prisma.user.count();
  const guestCount = await prisma.guestProfile.count();
  const driverCount = await prisma.driverProfile.count();
  const accCount = await prisma.accommodation.count();
  const tripCount = await prisma.trip.count();
  const requestCount = await prisma.rideRequest.count();

  console.log('\n✅ Delhi seed complete!\n');
  console.log('📊 Summary:');
  console.log(`   City:           Delhi, India`);
  console.log(`   Venue:          Bharat Mandapam (Pragati Maidan)`);
  console.log(`   Airport:        IGI Airport T3`);
  console.log(`   Users:          ${userCount} (1 admin + ${driverCount} drivers + ${guestCount} guests)`);
  console.log(`   Accommodations: ${accCount} (Taj Palace, Leela Palace, ITC Maurya, JW Marriott Aerocity)`);
  console.log(`   Trips:          ${tripCount}`);
  console.log(`   Ride Requests:  ${requestCount}`);
  console.log('\n🔑 Login credentials:');
  console.log('   Admin:  admin@tbs.event / admin123');
  console.log('   Driver: driver1@tbs.event / driver123 (through driver15)');
  console.log('   Guest:  guest1@tbs.event / guest123 (through guest50)');
}

main()
  .catch((e) => {
    console.error('Seed error:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

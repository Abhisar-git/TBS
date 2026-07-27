import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

// Coordinates for Delhi locations
const LOCATIONS = {
  AIRPORT_T3: { lat: 28.5562, lng: 77.1000, address: 'Indira Gandhi International Airport, Terminal 3, New Delhi' },
  NDLS_STATION: { lat: 28.6430, lng: 77.2194, address: 'New Delhi Railway Station, Paharganj, New Delhi' },
  ANVT_STATION: { lat: 28.6508, lng: 77.3152, address: 'Anand Vihar Terminal, East Delhi' },
  BHARAT_MANDAPAM: { lat: 28.6186, lng: 77.2486, address: 'Bharat Mandapam, Pragati Maidan, New Delhi' },
  HOTELS: [
    { name: 'Taj Palace, Chanakyapuri', lat: 28.5910, lng: 77.1720, address: 'Sardar Patel Marg, Diplomatic Enclave, New Delhi' },
    { name: 'The Leela Palace, Chanakyapuri', lat: 28.5833, lng: 77.1873, address: 'Diplomatic Enclave, Chanakyapuri, New Delhi' },
    { name: 'ITC Maurya, Diplomatic Enclave', lat: 28.5925, lng: 77.1725, address: 'Diplomatic Enclave, Sardar Patel Marg, New Delhi' },
    { name: 'JW Marriott, Aerocity', lat: 28.5504, lng: 77.1213, address: 'Asset Area 4, Aerocity, New Delhi' },
  ],
};

const GUEST_NAMES = [
  'Aarav Sharma', 'Ananya Gupta', 'Rohan Verma', 'Priya Patel', 'Vikram Singh',
  'Isha Kapoor', 'Aditya Joshi', 'Kavya Malhotra', 'Siddharth Rao', 'Diya Mehta',
  'Arjun Nair', 'Sneha Reddy', 'Rahul Chopra', 'Neha Agarwal', 'Karan Bhatia',
  'Pooja Deshmukh', 'Varun Saxena', 'Rhea Bansal', 'Gautam Pandey', 'Tanya Roy',
  'Amitabh Sengupta', 'Sunita Trivedi', 'Devendra Jha', 'Nisha Kulkarni', 'Rajesh Iyer',
  'Meera Menon', 'Sanjay Dutt', 'Archana Srivastava', 'Venkatesh Prasad', 'Swati Hegde',
  'Abhinav Shukla', 'Ritu Saxena', 'Alok Pandey', 'Geeta Vishwanathan', 'Manish Malhotra',
  'Divya Khosla', 'Pankaj Tripathi', 'Seema Biswas', 'Nitin Gadkari', 'Shilpa Shetty',
  'Rishabh Pant', 'Smriti Mandhana', 'Neeraj Chopra', 'PV Sindhu', 'Sunil Chhetri',
  'Saina Nehwal', 'Rohan Bopanna', 'Deepika Kumari', 'Achanta Sharath', 'Bhavani Devi',
];

const DRIVER_NAMES = [
  'Rajesh Kumar', 'Suresh Pal', 'Ramesh Yadav', 'Mahesh Verma', 'Dinesh Singh',
  'Mukesh Sharma', 'Rakesh Gupta', 'Sanjay Paswan', 'Vijay Chauhan', 'Ajay Saini',
  'Sunil Rawat', 'Anil Tomar', 'Pramod Mishra', 'Vinod Joshi', 'Satish Tyagi',
];

const VEHICLE_MODELS = [
  'Toyota Innova Crysta', 'Toyota Fortuner', 'Maruti Suzuki Ertiga',
  'Mercedes-Benz E-Class', 'BMW 5 Series', 'Audi A6',
  'Honda City', 'Hyundai Alcazar', 'Kia Carens', 'Force Urbania',
];

async function main() {
  console.log('🌱 Seeding TBS database with Delhi event data...\n');

  // Clear existing data in correct sequence
  console.log('🧹 Clearing existing data...');
  await prisma.distanceCache.deleteMany();
  await prisma.rideRequest.deleteMany();
  await prisma.tripPassenger.deleteMany();
  await prisma.trip.deleteMany();
  await prisma.guestProfile.deleteMany();
  await prisma.driverProfile.deleteMany();
  await prisma.user.deleteMany();
  await prisma.accommodation.deleteMany();

  // 1. Create Delhi Accommodations
  console.log('🏨 Creating Delhi accommodations...');
  const accommodations = [];
  for (const hotel of LOCATIONS.HOTELS) {
    const acc = await prisma.accommodation.create({
      data: {
        name: hotel.name,
        address: hotel.address,
        lat: hotel.lat,
        lng: hotel.lng,
      },
    });
    accommodations.push(acc);
  }

  // 2. Hash Password
  const passwordHash = await bcrypt.hash('admin123', 10);
  const driverPasswordHash = await bcrypt.hash('driver123', 10);
  const guestPasswordHash = await bcrypt.hash('guest123', 10);

  // 3. Create Admin User
  console.log('👑 Creating admin user...');
  await prisma.user.create({
    data: {
      name: 'Event Director',
      email: 'admin@tbs.event',
      phone: '+91 98765 00000',
      passwordHash,
      role: 'ADMIN',
    },
  });

  // 4. Create Drivers
  console.log('🚗 Creating 15 drivers...');
  const drivers = [];
  for (let i = 0; i < DRIVER_NAMES.length; i++) {
    const name = DRIVER_NAMES[i];
    const vehicleModel = VEHICLE_MODELS[i % VEHICLE_MODELS.length];
    const isLarge = vehicleModel.includes('Innova') || vehicleModel.includes('Fortuner') || vehicleModel.includes('Urbania') || vehicleModel.includes('Alcazar') || vehicleModel.includes('Carens');

    const user = await prisma.user.create({
      data: {
        name,
        email: `driver${i + 1}@tbs.event`,
        phone: `+91 98765 ${String(1000 + i + 1).padStart(5, '0')}`,
        passwordHash: driverPasswordHash,
        role: 'DRIVER',
        driverProfile: {
          create: {
            vehicleNumber: `DL 01 ET ${1000 + i}`,
            vehicleModel,
            seatCapacity: isLarge ? 6 : 4,
            luggageCapacity: isLarge ? 5 : 3,
            status: i < 10 ? 'AVAILABLE' : i < 13 ? 'ON_TRIP' : 'ON_BREAK',
            currentLat: LOCATIONS.AIRPORT_T3.lat + (Math.random() - 0.5) * 0.05,
            currentLng: LOCATIONS.AIRPORT_T3.lng + (Math.random() - 0.5) * 0.05,
            locationUpdatedAt: new Date(),
          },
        },
      },
      include: { driverProfile: true },
    });
    if (user.driverProfile) drivers.push(user.driverProfile);
  }

  // 5. Create Guests
  console.log('👥 Creating 50 guests...');
  const guests = [];
  const pickupPoints = [
    LOCATIONS.AIRPORT_T3.address,
    LOCATIONS.NDLS_STATION.address,
    LOCATIONS.ANVT_STATION.address,
  ];

  for (let i = 0; i < GUEST_NAMES.length; i++) {
    const name = GUEST_NAMES[i];
    const acc = accommodations[i % accommodations.length];
    const pickup = pickupPoints[i % pickupPoints.length];

    const user = await prisma.user.create({
      data: {
        name,
        email: `guest${i + 1}@tbs.event`,
        phone: `+91 98100 ${String(2000 + i + 1).padStart(5, '0')}`,
        passwordHash: guestPasswordHash,
        role: 'GUEST',
        guestProfile: {
          create: {
            flightOrTrainNumber: i % 2 === 0 ? `AI-${100 + i}` : `1200${i % 10}`,
            groupSize: (i % 3) + 1,
            luggageCount: (i % 3) + 1,
            status: i < 15 ? 'WAITING' : i < 30 ? 'ASSIGNED' : i < 40 ? 'IN_TRANSIT' : 'ARRIVED',
            pickupPoint: pickup,
            accommodationId: acc.id,
          },
        },
      },
      include: { guestProfile: true },
    });
    if (user.guestProfile) guests.push(user.guestProfile);
  }

  // 6. Create Sample Trips
  console.log('🚕 Creating sample Delhi trips...');
  for (let i = 0; i < 7; i++) {
    const driver = drivers[i];
    const guest = guests[i];
    const hotel = accommodations[i % accommodations.length];

    const trip = await prisma.trip.create({
      data: {
        tripType: i % 2 === 0 ? 'ARRIVAL' : 'VENUE_TRANSFER',
        driverId: driver.id,
        status: i < 3 ? 'DRIVER_ASSIGNED' : i < 5 ? 'IN_PROGRESS' : 'COMPLETED',
        pickupAddress: LOCATIONS.AIRPORT_T3.address,
        pickupLat: LOCATIONS.AIRPORT_T3.lat,
        pickupLng: LOCATIONS.AIRPORT_T3.lng,
        dropoffAddress: hotel.address,
        dropoffLat: hotel.lat,
        dropoffLng: hotel.lng,
        scheduledPickupAt: new Date(Date.now() + i * 3600000),
        passengers: {
          create: {
            guestProfileId: guest.id,
            boardingStatus: i < 5 ? 'ASSIGNED' : 'DROPPED_OFF',
          },
        },
      },
    });

    // Update guest status
    await prisma.guestProfile.update({
      where: { id: guest.id },
      data: { status: i < 3 ? 'ASSIGNED' : i < 5 ? 'IN_TRANSIT' : 'ARRIVED' },
    });
  }

  // 7. Create Sample Ride Requests
  console.log('📝 Creating sample ride requests...');
  for (let i = 15; i < 18; i++) {
    const guest = guests[i];
    const hotel = accommodations[i % accommodations.length];

    await prisma.rideRequest.create({
      data: {
        guestProfileId: guest.id,
        pickupPoint: LOCATIONS.AIRPORT_T3.address,
        dropoffPoint: hotel.address,
        status: i === 15 ? 'PENDING' : 'APPROVED',
      },
    });
  }

  console.log('\n✅ Delhi seed complete!\n');
  console.log('📊 Summary:');
  console.log(`   City:           Delhi, India`);
  console.log(`   Venue:          Bharat Mandapam (Pragati Maidan)`);
  console.log(`   Airport:        IGI Airport T3`);
  console.log(`   Users:          ${1 + drivers.length + guests.length} (1 admin + ${drivers.length} drivers + ${guests.length} guests)`);
  console.log(`   Accommodations: ${accommodations.length} (Taj Palace, Leela Palace, ITC Maurya, JW Marriott Aerocity)`);
  console.log(`   Trips:          7`);
  console.log(`   Ride Requests:  3\n`);
  console.log('🔑 Login credentials:');
  console.log('   Admin:  admin@tbs.event / admin123');
  console.log('   Driver: driver1@tbs.event / driver123 (through driver15)');
  console.log('   Guest:  guest1@tbs.event / guest123 (through guest50)\n');
}

main()
  .catch((e) => {
    console.error('❌ Seeding error:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

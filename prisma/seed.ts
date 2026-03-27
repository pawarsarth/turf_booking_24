import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  const adminPass = await bcrypt.hash('admin123', 12);
  const admin = await prisma.user.upsert({
    where: { email: 'admin@turfbook.com' },
    update: {},
    create: { name: 'Admin', email: 'admin@turfbook.com', password: adminPass, role: 'ADMIN', monthlyLimit: 999999 },
  });

  const ownerPass = await bcrypt.hash('owner123', 12);
  const owner = await prisma.user.upsert({
    where: { email: 'owner@turfbook.com' },
    update: {},
    create: { name: 'Turf Owner', email: 'owner@turfbook.com', password: ownerPass, role: 'OWNER', phone: '9876543210', monthlyLimit: 50000 },
  });

  await prisma.turf.createMany({
    skipDuplicates: true,
    data: [
      {
        name: 'Green Field Arena',
        description: 'Premium football and cricket turf with world-class facilities and floodlights for night games.',
        location: 'Arera Colony', address: '12 Arera Colony, Near DB Mall', city: 'Bhopal',
        sport: ['FOOTBALL', 'CRICKET'], pricePerHour: 800,
        images: ['https://images.unsplash.com/photo-1540747913346-19212a4f9de6?w=800'],
        amenities: ['Floodlights', 'Changing Room', 'Parking', 'Water Dispenser', 'First Aid'],
        openTime: '06:00', closeTime: '23:00', ownerId: owner.id,
        ownerPhone: '9876543210', ownerEmail: 'owner@turfbook.com',
      },
      {
        name: 'Slam Dunk Court',
        description: 'Professional indoor basketball court with hardwood flooring and full scoring system.',
        location: 'MP Nagar', address: 'Zone 2, MP Nagar', city: 'Bhopal',
        sport: ['BASKETBALL'], pricePerHour: 600,
        images: ['https://images.unsplash.com/photo-1546519638-68e109498ffc?w=800'],
        amenities: ['AC', 'Scoreboard', 'Changing Room', 'Parking'],
        openTime: '07:00', closeTime: '22:00', ownerId: owner.id,
        ownerPhone: '9876543210', ownerEmail: 'owner@turfbook.com',
      },
      {
        name: 'Champions Cricket Ground',
        description: 'Full-size cricket pitch with practice nets, pavilion, and floodlights.',
        location: 'Kolar Road', address: 'Kolar Road, Near Ring Road', city: 'Bhopal',
        sport: ['CRICKET'], pricePerHour: 1000,
        images: ['https://images.unsplash.com/photo-1624526267942-ab0ff8a3e972?w=800'],
        amenities: ['Practice Nets', 'Pavilion', 'Floodlights', 'Cafeteria', 'Parking'],
        openTime: '05:00', closeTime: '21:00', ownerId: owner.id,
        ownerPhone: '9876543210', ownerEmail: 'owner@turfbook.com',
      },
    ],
  });

  console.log('✅ Seed done');
  console.log('Admin:', admin.email, '/ admin123');
  console.log('Owner:', owner.email, '/ owner123');
}

main().catch(console.error).finally(() => prisma.$disconnect());

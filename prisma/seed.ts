import { PrismaClient } from "@prisma/client";
import { v4 } from "uuid";
import { faker } from "@faker-js/faker";
import fakeUsers from "./fakeUsers";

const prisma = new PrismaClient();

function profPicUrl(name: string) {
  return faker.image.avatar();
}

function upperFirst(str: string) {
  return str.charAt(0).toUpperCase() + str.slice(1);
}

async function addFakeUsers() {
  await prisma.user.createMany({
    data: fakeUsers.map((fu) => ({
      signedUpAt: faker.date.between("2020-01-01", new Date()),
      name: `${upperFirst(fu.first_name)} ${upperFirst(fu.last_name)}`,
      email: fu.email,
      canUpload: false,
      imageUrl: profPicUrl(fu.first_name + fu.last_name),
      isVerified: faker.datatype.number({ min: 0, max: 100 }) > 70,
    })),
  });
}

const randomElement = <T>(arr: T[]) =>
  arr[Math.floor(Math.random() * arr.length)];

async function main() {
  await addFakeUsers();

  const alex = await prisma.user.create({
    data: {
      signedUpAt: faker.date.between("2020-01-01", new Date()),
      isVerified: true,
      name: "Alex Arena",
      email: "im@alexarena.com",
      canUpload: false,
      imageUrl: profPicUrl("Alex Arena"),
    },
  });

  const kyle = await prisma.user.create({
    data: {
      signedUpAt: faker.date.between("2020-01-01", new Date()),
      name: "Kyle Sanok",
      email: "ksanok10@gmail.com",
      imageUrl: profPicUrl("Kyle Sanok"),
      canUpload: false,
    },
  });

  const amelia = await prisma.user.findUnique({
    where: { email: "amelia.mercier@example.com" },
  });

  const sarah = await prisma.user.findUnique({
    where: { email: "sarah.oliver@example.com" },
  });

  if (!amelia || !sarah) throw new Error("Missing users");

  const att = await prisma.channel.create({
    data: {
      id: v4(),
      name: "Alex's Tech Tips",
      ownerId: alex.id,
    },
  });

  const m1Max = {
    id: "65e16d5b-2f5f-43cf-bf28-b526fb6c55b5",
    title: 'M1 Max vs Intel 16" MacBook Pro',
    url: "http://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerEscapes.mp4",
    thumbnailUrl: "https://i.ytimg.com/vi/rr2XfL_df3o/hq720.jpg",
    channelId: att.id,
    price: 5,
  };

  await prisma.video.createMany({
    data: [
      {
        title: "Building my Dream PC",
        url: "http://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4",
        thumbnailUrl: "https://i.ytimg.com/vi/odEsN1_dpDE/hq720.jpg",
        channelId: att.id,
        price: 10,
      },
      {
        title: "Creating a Hackintosh in 2022",
        url: "http://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerEscapes.mp4",
        thumbnailUrl: "https://i.ytimg.com/vi/J1d0AmVFWKM/hq720.jpg",
        channelId: att.id,
        price: 5,
      },
      m1Max,
    ],
  });

  await prisma.userComment.create({
    data: {
      id: "a3c56101-8380-4fb3-853b-3756fae0d44e",
      videoId: m1Max.id,
      authorId: amelia.id,
      content:
        "Hello I earn $6k/month from home doing NOTHING but mining Bitcoin on an old computer. Want 2 get rich to? chEck out: bitc0inrich.ru/bitc0in",
    },
  });

  await prisma.userComment.create({
    data: {
      videoId: m1Max.id,
      authorId: sarah.id,
      content:
        "Nice! Just ordered my M1 Max MBP. Should be arriving any day 🤞",
    },
  });

  await prisma.userComment.create({
    data: {
      videoId: m1Max.id,
      authorId: kyle.id,
      content: "Maybe now I'll be able to run _two_ Electron apps at once?",
    },
  });

  const videos = await prisma.video.findMany();

  const dates = [
    "January 17, 2021",
    "February 23, 2022",
    "February 22, 2022",
  ].map((d) => new Date(d));

  for (const v of videos) {
    const d = randomElement(dates);
    await prisma.videoPurchase.create({
      data: {
        ownerId: kyle.id,
        videoId: v.id,
        amount: v.price,
        createdAt: d,
        updatedAt: d,
      },
    });
  }
}

main();

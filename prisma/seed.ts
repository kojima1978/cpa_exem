import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  const subjectCount = await prisma.subject.count();
  if (subjectCount > 0) {
    console.log("Seed data already exists, skipping.");
    return;
  }

  const subjects = await Promise.all([
    prisma.subject.create({ data: { name: "財務会計論", displayOrder: 1 } }),
    prisma.subject.create({ data: { name: "管理会計論", displayOrder: 2 } }),
    prisma.subject.create({ data: { name: "監査論", displayOrder: 3 } }),
    prisma.subject.create({ data: { name: "企業法", displayOrder: 4 } }),
  ]);

  const zaimu = subjects[0];

  const topics = [
    "簿記",
    "財務諸表論",
    "連結会計",
    "金融商品",
    "税効果会計",
    "退職給付会計",
    "減損会計",
    "リース会計",
    "外貨建取引",
    "ストック・オプション",
  ];

  await Promise.all(
    topics.map((name, i) =>
      prisma.topic.create({
        data: { subjectId: zaimu.id, name, displayOrder: i + 1 },
      })
    )
  );

  const sessions = [
    { name: "企業会計原則", description: "企業会計原則の一般原則・損益計算書原則・貸借対照表原則" },
    { name: "概念フレームワーク", description: "討議資料「財務会計の概念フレームワーク」" },
    { name: "収益認識基準", description: "収益認識に関する会計基準" },
    { name: "金融商品基準", description: "金融商品に関する会計基準" },
    { name: "棚卸資産基準", description: "棚卸資産の評価に関する会計基準" },
    { name: "固定資産基準", description: "固定資産の減損に係る会計基準" },
    { name: "リース基準", description: "リースに関する会計基準" },
    { name: "退職給付基準", description: "退職給付に関する会計基準" },
    { name: "税効果基準", description: "税効果会計に係る会計基準" },
    { name: "外貨建取引基準", description: "外貨建取引等会計処理基準" },
    { name: "連結会計基準", description: "連結財務諸表に関する会計基準" },
    { name: "企業結合基準", description: "企業結合に関する会計基準" },
    { name: "ストック・オプション基準", description: "ストック・オプション等に関する会計基準" },
  ];

  await Promise.all(
    sessions.map((s, i) =>
      prisma.session.create({
        data: { subjectId: zaimu.id, ...s, displayOrder: i + 1 },
      })
    )
  );

  console.log("Seed data created successfully.");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());

"use client";

import { GenericBoardPage, joinContact } from "@/components/GenericBoard";

export default function SecondhandPage() {
  return (
    <GenericBoardPage
      formKey="secondhand"
      type="secondhand"
      title="二手市场"
      emptyHint="还没有二手信息。"
      accent="from-teal-400 to-cyan-500"
      bg="bg-teal-50"
      titleField={{ key: "itemName", label: "物品" }}
      fields={[
        { key: "categoryKey", label: "类别" },
        { key: "condition", label: "新旧程度" },
        { key: "price", label: "售价 USD" },
        { key: "description", label: "物品描述" },
        { key: "address", label: "物品地址" },
        { key: "contactPerson", label: "联系人" },
        {
          key: "contact",
          label: "联系方式",
          format: (d) => joinContact(d, "contact"),
        },
      ]}
    />
  );
}

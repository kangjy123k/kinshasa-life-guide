"use client";

import { GenericBoardPage, joinContact, joinRange } from "@/components/GenericBoard";

export default function JobsPage() {
  return (
    <GenericBoardPage
      formKey="jobseeker"
      type="jobseeker"
      title="求职信息"
      emptyHint="还没有求职信息。"
      accent="from-amber-400 to-yellow-500"
      bg="bg-amber-50"
      titleField={{ key: "targetPosition", label: "目标岗位" }}
      fields={[
        { key: "name", label: "称呼" },
        { key: "gender", label: "性别" },
        { key: "age", label: "年龄" },
        { key: "experienceYears", label: "工作年限" },
        { key: "expectCity", label: "期望工作地" },
        {
          key: "expectSalary",
          label: "期望年薪",
          format: (d) => joinRange(d, "expectSalary", " USD"),
        },
        { key: "skills", label: "技能描述" },
        { key: "achievements", label: "过往成就" },
        { key: "unacceptable", label: "不可接受" },
        {
          key: "contact",
          label: "联系方式",
          format: (d) => joinContact(d, "contact"),
        },
      ]}
    />
  );
}

"use client";

import { GenericBoardPage, joinRange } from "@/components/GenericBoard";

export default function HiringPage() {
  return (
    <GenericBoardPage
      formKey="hiring"
      type="hiring"
      title="招聘信息"
      emptyHint="还没有招聘信息。"
      accent="from-red-400 to-rose-500"
      bg="bg-rose-50"
      titleField={{ key: "position", label: "招聘职位" }}
      fields={[
        {
          key: "company",
          label: "公司",
          format: (d) =>
            d.companyPublic === "展示"
              ? [d.companyZh, d.companyIntl].filter(Boolean).join(" / ")
              : "暂时保密",
        },
        { key: "industry", label: "行业" },
        { key: "registrationCountry", label: "注册国家" },
        { key: "workCity", label: "工作地点" },
        { key: "jobContent", label: "工作内容" },
        { key: "requirement", label: "任职条件" },
        {
          key: "salary",
          label: "年薪",
          format: (d) => joinRange(d, "salary", " USD"),
        },
        { key: "benefits", label: "其他福利" },
        { key: "recruiterName", label: "负责人" },
        { key: "recruiterContact", label: "联系方式" },
        { key: "deadline", label: "截止日期" },
      ]}
    />
  );
}

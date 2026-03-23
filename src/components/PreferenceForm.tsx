"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import type { Gender, Collection } from "@/lib/types";

interface PreferenceFormProps {
  onSubmit: (
    surname: string,
    gender: Gender,
    collections: Collection[],
    designatedChar?: string
  ) => void;
  loading: boolean;
}

const COLLECTIONS: { value: Collection; label: string }[] = [
  { value: "诗经", label: "诗经" },
  { value: "楚辞", label: "楚辞" },
  { value: "唐诗", label: "唐诗" },
  { value: "宋词", label: "宋词" },
  { value: "论语", label: "论语" },
  { value: "道德经", label: "道德经" },
];

export default function PreferenceForm({
  onSubmit,
  loading,
}: PreferenceFormProps) {
  const [surname, setSurname] = useState("");
  const [designatedChar, setDesignatedChar] = useState("");
  const [gender, setGender] = useState<Gender>("neutral");
  const [selectedCollections, setSelectedCollections] = useState<Collection[]>(
    []
  );

  const toggleCollection = (col: Collection) => {
    setSelectedCollections((prev) =>
      prev.includes(col) ? prev.filter((c) => c !== col) : [...prev, col]
    );
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!surname.trim()) return;
    onSubmit(
      surname.trim(),
      gender,
      selectedCollections,
      designatedChar.trim() || undefined
    );
  };

  return (
    <motion.form
      onSubmit={handleSubmit}
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.3 }}
      className="w-full max-w-lg mx-auto space-y-6"
    >
      {/* 姓氏输入 */}
      <div className="text-center">
        <div className="relative inline-block">
          <input
            type="text"
            value={surname}
            onChange={(e) => setSurname(e.target.value)}
            placeholder="请输入您的姓氏"
            maxLength={2}
            className="w-64 h-14 text-center text-xl tracking-[0.3em] bg-transparent
                       border-b-2 border-[var(--color-gold-deep)] outline-none
                       text-[var(--color-ink)] placeholder:text-[var(--color-ink-muted)]/50
                       focus:border-[var(--color-rust)] transition-colors"
            style={{ fontFamily: "var(--font-kai), serif" }}
          />
        </div>
      </div>

      {/* 指定字输入（可选） */}
      <div className="text-center">
        <p className="text-sm text-[var(--color-ink-muted)] mb-2">
          指定字（可选）
        </p>
        <div className="relative inline-block">
          <input
            type="text"
            value={designatedChar}
            onChange={(e) => setDesignatedChar(e.target.value)}
            placeholder="如：瑶"
            maxLength={1}
            className="w-32 h-11 text-center text-lg tracking-[0.3em] bg-transparent
                       border-b border-[var(--color-gold)] outline-none
                       text-[var(--color-ink)] placeholder:text-[var(--color-ink-muted)]/40
                       focus:border-[var(--color-rust)] transition-colors"
            style={{ fontFamily: "var(--font-kai), serif" }}
          />
        </div>
        <p className="text-xs text-[var(--color-ink-muted)]/60 mt-1.5">
          希望名字中包含的字，将从古诗词中寻找搭配
        </p>
      </div>

      {/* 性别选择 */}
      <div className="text-center">
        <p className="text-sm text-[var(--color-ink-muted)] mb-3">性别偏好</p>
        <div className="flex justify-center gap-3">
          {(
            [
              { value: "male", label: "男孩", icon: "♂" },
              { value: "female", label: "女孩", icon: "♀" },
              { value: "neutral", label: "不限", icon: "◎" },
            ] as const
          ).map((option) => (
            <button
              key={option.value}
              type="button"
              onClick={() => setGender(option.value)}
              className={`px-5 py-2 rounded-full text-sm transition-all border ${
                gender === option.value
                  ? "bg-[var(--color-rust)] text-white border-[var(--color-rust)]"
                  : "bg-transparent text-[var(--color-ink-light)] border-[var(--color-gold)] hover:border-[var(--color-rust-light)]"
              }`}
            >
              {option.icon} {option.label}
            </button>
          ))}
        </div>
      </div>

      {/* 典籍偏好 */}
      <div className="text-center">
        <p className="text-sm text-[var(--color-ink-muted)] mb-3">
          典籍偏好（可多选，不选则不限）
        </p>
        <div className="flex flex-wrap justify-center gap-2">
          {COLLECTIONS.map((col) => (
            <button
              key={col.value}
              type="button"
              onClick={() => toggleCollection(col.value)}
              className={`px-4 py-1.5 rounded-full text-sm transition-all border ${
                selectedCollections.includes(col.value)
                  ? "bg-[var(--color-bamboo)] text-white border-[var(--color-bamboo)]"
                  : "bg-transparent text-[var(--color-ink-light)] border-[var(--color-gold)] hover:border-[var(--color-bamboo)]"
              }`}
            >
              {col.label}
            </button>
          ))}
        </div>
      </div>

      {/* 提交按钮 */}
      <div className="text-center pt-2">
        <button
          type="submit"
          disabled={!surname.trim() || loading}
          className="px-10 py-3 bg-[var(--color-rust)] text-white rounded-full text-base
                     tracking-[0.2em] hover:bg-[var(--color-walnut)] transition-colors
                     disabled:opacity-40 disabled:cursor-not-allowed
                     shadow-md hover:shadow-lg"
          style={{ fontFamily: "var(--font-serif)" }}
        >
          {loading ? "AI 正在翻阅古籍..." : "为 我 取 名"}
        </button>
      </div>
    </motion.form>
  );
}

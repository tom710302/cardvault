import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { createClient } from "@/lib/supabase/server";

interface Props {
  settingKey: string;
  title: string;
  backHref?: string;
}

export async function StaticPage({ settingKey, title, backHref = "/" }: Props) {
  const supabase = createClient();
  const { data } = await supabase
    .from("site_settings")
    .select("value")
    .eq("key", settingKey)
    .single();

  const content = typeof data?.value === "string" ? data.value : null;

  return (
    <div className="max-w-3xl mx-auto px-4 py-12 space-y-8">
      <Link
        href={backHref}
        className="inline-flex items-center gap-2 text-sm text-gray-400 hover:text-gray-200 transition-colors"
      >
        <ArrowLeft className="w-4 h-4" /> 返回
      </Link>

      <div>
        <h1 className="text-3xl font-bold text-white mb-8">{title}</h1>

        <div className="glass rounded-2xl p-8">
          {content ? (
            <div className="space-y-5 text-gray-300 leading-relaxed text-sm">
              {content.split("\n\n").map((para, i) => {
                if (para.startsWith("## ")) {
                  return (
                    <h2 key={i} className="text-lg font-semibold text-white pt-3">
                      {para.slice(3)}
                    </h2>
                  );
                }
                if (para.startsWith("# ")) {
                  return (
                    <h2 key={i} className="text-xl font-bold text-white pt-4">
                      {para.slice(2)}
                    </h2>
                  );
                }
                return (
                  <p key={i}>
                    {para.split("\n").map((line, j, arr) => (
                      <span key={j}>
                        {line}
                        {j < arr.length - 1 && <br />}
                      </span>
                    ))}
                  </p>
                );
              })}
            </div>
          ) : (
            <p className="text-gray-500 text-sm text-center py-8">
              內容尚未設定，請至後台「文案編輯」填寫。
            </p>
          )}
        </div>

        <p className="text-xs text-gray-700 text-center mt-6">
          最後更新：{new Date().toLocaleDateString("zh-TW")}
        </p>
      </div>
    </div>
  );
}

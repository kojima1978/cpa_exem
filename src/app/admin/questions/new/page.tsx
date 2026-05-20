import { QuestionForm } from "@/components/QuestionForm";

export default function NewQuestionPage() {
  return (
    <div>
      <h1 className="text-xl font-bold">問題作成</h1>
      <div className="mt-4 rounded-xl border bg-white p-5 shadow-sm">
        <QuestionForm />
      </div>
    </div>
  );
}

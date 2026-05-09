import { useEffect, useState } from 'react';
import { ChevronDown, ChevronUp, Plus, RotateCcw, Save, Trash2 } from 'lucide-react';

type QuestionType = 'short' | 'true_false';
type BoolAnswer = '' | 'True' | 'False';

type Question = {
  id: string;
  text: string;
  type: QuestionType;
  answer: BoolAnswer;
  children: Question[];
};

type ReviewQuestion = Omit<Question, 'children'> & {
  label: string;
  children: ReviewQuestion[];
};

type QuestionEditorProps = {
  question: Question;
  numbering: string;
  depth: number;
  onChange: (updated: Question) => void;
  onDelete: () => void;
  onAddChild: () => void;
};

const STORAGE_KEY = 'infollion_nested_form_task5';

function makeId(): string {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
    return crypto.randomUUID();
  }
  return `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

function createQuestion(): Question {
  return {
    id: makeId(),
    text: '',
    type: 'short',
    answer: '',
    children: [],
  };
}

function normalizeQuestion(value: unknown): Question {
  const q = value as Partial<Question>;
  return {
    id: typeof q.id === 'string' ? q.id : makeId(),
    text: typeof q.text === 'string' ? q.text : '',
    type: q.type === 'true_false' ? 'true_false' : 'short',
    answer: q.answer === 'True' || q.answer === 'False' ? q.answer : '',
    children: Array.isArray(q.children) ? q.children.map(normalizeQuestion) : [],
  };
}

function loadQuestions(): Question[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [createQuestion()];
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed) || parsed.length === 0) return [createQuestion()];
    return parsed.map(normalizeQuestion);
  } catch {
    return [createQuestion()];
  }
}

function saveQuestions(questions: Question[]) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(questions));
  } catch {
    // ignore storage issues
  }
}

function addChild(nodes: Question[], targetId: string): Question[] {
  return nodes.map((node) => {
    if (node.id === targetId) {
      return { ...node, children: [...node.children, createQuestion()] };
    }
    return node.children.length ? { ...node, children: addChild(node.children, targetId) } : node;
  });
}

function buildReview(questions: Question[], prefix = 'Q'): ReviewQuestion[] {
  return questions.map((q, index) => {
    const label = `${prefix}${index + 1}`;
    return {
      ...q,
      label,
      children: q.children.length ? buildReview(q.children, `${label}.`) : [],
    };
  });
}

function moveParent(questions: Question[], index: number, direction: number): Question[] {
  const next = [...questions];
  const swapIndex = index + direction;
  if (swapIndex < 0 || swapIndex >= next.length) return next;
  [next[index], next[swapIndex]] = [next[swapIndex], next[index]];
  return next;
}

function QuestionEditor({ question, numbering, depth, onChange, onDelete, onAddChild }: QuestionEditorProps) {
  const isBoolean = question.type === 'true_false';
  const canAddChild = isBoolean && question.answer === 'True';

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm transition hover:shadow-md">
      <div className="flex items-start gap-3">
        <div className="mt-1.5 rounded-full bg-slate-100 p-2 text-slate-500">
          <span className="block h-3 w-3 rounded-full border border-slate-400" />
        </div>

        <div className="min-w-0 flex-1 space-y-4">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-sm font-semibold text-slate-500">{numbering}</p>
              <p className="text-xs text-slate-400">{depth === 0 ? 'Parent question' : 'Child question'}</p>
            </div>

            <button
              type="button"
              onClick={onDelete}
              className="inline-flex items-center gap-1.5 rounded-xl border border-red-200 px-3 py-1.5 text-sm font-medium text-red-600 hover:bg-red-50"
            >
              <Trash2 size={15} /> Delete
            </button>
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">Question text</label>
            <input
              value={question.text}
              onChange={(e) => onChange({ ...question, text: e.target.value })}
              placeholder="Type the question here"
              className="w-full rounded-xl border border-slate-300 px-3 py-2.5 outline-none transition focus:border-slate-500"
            />
          </div>

          <div className="grid gap-3 md:grid-cols-2">
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">Question type</label>
              <select title="Question type"
                value={question.type}
                onChange={(e) => {
                  const nextType = e.target.value as QuestionType;
                  onChange({
                    ...question,
                    type: nextType,
                    answer: nextType === 'short' ? '' : question.answer,
                    children: nextType === 'short' ? [] : question.children,
                  });
                }}
                className="w-full rounded-xl border border-slate-300 px-3 py-2.5 outline-none transition focus:border-slate-500"
              >
                <option value="short">Short Answer</option>
                <option value="true_false">True/False</option>
              </select>
            </div>

            {isBoolean && (
              <div>
                <label className="mb-1 block text-sm font-medium text-slate-700">Answer</label>
                <select title="Answer selection"
                  value={question.answer}
                  onChange={(e) => {
                    const nextAnswer = e.target.value as BoolAnswer;
                    onChange({
                      ...question,
                      answer: nextAnswer,
                      children: nextAnswer === 'True' ? question.children : [],
                    });
                  }}
                  className="w-full rounded-xl border border-slate-300 px-3 py-2.5 outline-none transition focus:border-slate-500"
                >
                  <option value="">Select answer</option>
                  <option value="True">True</option>
                  <option value="False">False</option>
                </select>
              </div>
            )}
          </div>

          {canAddChild && (
            <button
              type="button"
              onClick={onAddChild}
              className="inline-flex items-center gap-2 rounded-xl bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800"
            >
              <Plus size={15} /> Add Child Question
            </button>
          )}
        </div>
      </div>

      {question.children.length > 0 && (
        <div className="mt-4 space-y-3 border-l-2 border-slate-200 pl-4">
          {question.children.map((child, index) => (
            <QuestionEditor
              key={child.id}
              question={child}
              numbering={`${numbering}.${index + 1}`}
              depth={depth + 1}
              onChange={(updatedChild) => {
                onChange({
                  ...question,
                  children: question.children.map((item) => (item.id === child.id ? updatedChild : item)),
                });
              }}
              onDelete={() => {
                onChange({
                  ...question,
                  children: question.children.filter((item) => item.id !== child.id),
                });
              }}
              onAddChild={() => {
                onChange(addChild([child], child.id)[0]);
              }}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function ReviewNode({ node, depth = 0 }: { node: ReviewQuestion; depth?: number }) {
  return (
    <div className="space-y-3">
     <div className={`rounded-2xl border border-slate-200 bg-white p-4 shadow-sm ml-${depth * 5}`}>
        <p className="text-sm font-semibold text-slate-500">{node.label}</p>
        <p className="mt-1 text-base font-medium text-slate-900">
          {node.text.trim() || <span className="text-slate-400">No question text entered</span>}
        </p>
        <p className="mt-2 text-sm text-slate-600">
          Type: <span className="font-medium">{node.type === 'true_false' ? 'True/False' : 'Short Answer'}</span>
          {node.type === 'true_false' && node.answer ? (
            <span> · Answer: <span className="font-medium">{node.answer}</span></span>
          ) : null}
        </p>
      </div>

      {node.children.length > 0 && (
        <div className="space-y-3">
          {node.children.map((child) => (
            <ReviewNode key={child.id} node={child} depth={depth + 1} />
          ))}
        </div>
      )}
    </div>
  );
}

export default function App() {
  const [questions, setQuestions] = useState<Question[]>(() => loadQuestions());
  const [submitted, setSubmitted] = useState(false);

  useEffect(() => {
    saveQuestions(questions);
  }, [questions]);

  const reviewTree = buildReview(questions);

  const addParentQuestion = () => setQuestions((prev) => [...prev, createQuestion()]);

  const resetAll = () => {
    const fresh = [createQuestion()];
    setQuestions(fresh);
    setSubmitted(false);
    saveQuestions(fresh);
  };

  return (
    <div className="min-h-screen bg-slate-50 px-4 py-6 text-slate-900 md:px-8 md:py-10">
      <div className="mx-auto max-w-6xl space-y-6">
        <section className="rounded-3xl bg-white p-6 shadow-sm ring-1 ring-slate-200 md:p-8">
          <div className="flex flex-col gap-5 md:flex-row md:items-end md:justify-between">
            <div>
              <p className="text-sm font-semibold uppercase tracking-[0.2em] text-slate-500">Infollion Research Services Ltd.</p>
              <h1 className="mt-2 text-3xl font-bold md:text-4xl">Nested Form Builder</h1>
              <p className="mt-3 max-w-3xl text-sm leading-6 text-slate-600 md:text-base">
                Create parent questions, add recursive child questions, keep the numbering hierarchical, and review the final structure in the app.
              </p>
            </div>

            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={addParentQuestion}
                className="inline-flex items-center gap-2 rounded-xl bg-slate-900 px-4 py-2.5 text-sm font-semibold text-white hover:bg-slate-800"
              >
                <Plus size={15} /> Add New Question
              </button>
              <button
                type="button"
                onClick={resetAll}
                className="inline-flex items-center gap-2 rounded-xl border border-slate-300 px-4 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-100"
              >
                <RotateCcw size={15} /> Reset
              </button>
            </div>
          </div>
        </section>

        {!submitted ? (
          <section className="space-y-4">
            {questions.map((question, index) => (
              <div key={question.id} className="space-y-3">
                <QuestionEditor
                  question={question}
                  numbering={`Q${index + 1}`}
                  depth={0}
                  onChange={(updated) => setQuestions((prev) => prev.map((item) => (item.id === question.id ? updated : item)))}
                  onDelete={() => setQuestions((prev) => prev.filter((item) => item.id !== question.id))}
                  onAddChild={() => setQuestions((prev) => addChild(prev, question.id))}
                />

                <div className="flex items-center justify-between px-1">
                  <span className="text-xs font-medium text-slate-500">Parent question {index + 1}</span>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => setQuestions((prev) => moveParent(prev, index, -1))}
                      disabled={index === 0}
                      className="inline-flex items-center gap-1.5 rounded-lg border border-slate-300 px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-40"
                    >
                      <ChevronUp size={14} /> Up
                    </button>
                    <button
                      type="button"
                      onClick={() => setQuestions((prev) => moveParent(prev, index, 1))}
                      disabled={index === questions.length - 1}
                      className="inline-flex items-center gap-1.5 rounded-lg border border-slate-300 px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-40"
                    >
                      <ChevronDown size={14} /> Down
                    </button>
                  </div>
                </div>
              </div>
            ))}

            <div className="flex justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={resetAll}
                className="inline-flex items-center gap-2 rounded-xl border border-slate-300 px-4 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-100"
              >
                <Save size={15} /> Clear Saved State
              </button>
              <button
                type="button"
                onClick={() => setSubmitted(true)}
                className="rounded-xl bg-emerald-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-emerald-500"
              >
                Submit Form
              </button>
            </div>
          </section>
        ) : (
          <section className="space-y-5 rounded-3xl border border-slate-200 bg-white p-6 shadow-sm md:p-8">
            <div>
              <h2 className="text-2xl font-bold">Hierarchical Review</h2>
              <p className="mt-1 text-sm text-slate-600">The form data is displayed below exactly in parent-child order.</p>
            </div>

            <div className="space-y-4">
              {reviewTree.map((node) => (
                <ReviewNode key={node.id} node={node} />
              ))}
            </div>

            <div className="flex justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => setSubmitted(false)}
                className="rounded-xl border border-slate-300 px-4 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-100"
              >
                Back to Edit
              </button>
              <button
                type="button"
                onClick={resetAll}
                className="rounded-xl bg-slate-900 px-4 py-2.5 text-sm font-semibold text-white hover:bg-slate-800"
              >
                Start Fresh
              </button>
            </div>
          </section>
        )}

        <div className="rounded-2xl border border-dashed border-slate-300 bg-white/80 p-4 text-sm text-slate-600">
          Auto-saves in local storage, supports recursive child questions, and keeps parent numbering in hierarchical form such as Q1, Q1.1, Q1.1.1.
        </div>
      </div>
    </div>
  );
}

'use client';

const presets = [
  { key: 'forgot_to_add', label: 'Forgot to add', hint: 'Share one helpful detail you missed.' },
  { key: 'resource', label: 'Resource', hint: 'Short case or tip; no fake links.' },
  { key: 'next_step_question', label: 'Next step?', hint: 'Ask 1 specific next step.' },
  { key: 'benefit_framing', label: 'Buried?', hint: 'Reframe benefit if it got buried.' },
  { key: 'deadline_or_capacity', label: 'Deadline/Capacity', hint: 'Only if real urgency exists.' },
  { key: 'easy_out', label: 'Easy out', hint: 'Give graceful "no/later" option.' },
];

export function FollowupPlaybook({ onPick }: { onPick: (k: string) => void }) {
  return (
    <div className="flex flex-wrap gap-2">
      {presets.map(p => (
        <button
          key={p.key}
          className="px-3 py-1.5 rounded-full border border-gray-200 text-sm text-gray-700 bg-white hover:shadow-sm hover:bg-blue-50 hover:border-blue-300 hover:text-blue-700 transition-all duration-150"
          onClick={() => onPick(p.key)}
          title={p.hint}
        >
          {p.label}
        </button>
      ))}
    </div>
  );
}
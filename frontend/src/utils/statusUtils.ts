export const getStageColor = (stage: string, state: string) => {
  if (state === 'Complete' || state === 'Completed') return 'bg-emerald-100 text-emerald-800 border-emerald-200';
  
  const s = stage.toLowerCase();
  if (s.includes('box')) return 'bg-amber-100 text-amber-800 border-amber-200';
  if (s.includes('meeting') || s.includes('initiated') || s.includes('scheduled')) return 'bg-purple-100 text-purple-800 border-purple-200';
  if (s.includes('deployment')) return 'bg-blue-100 text-blue-800 border-blue-200';
  if (s.includes('tuning') || s.includes('documentation') || s.includes('uat') || s.includes('sign')) return 'bg-indigo-100 text-indigo-800 border-indigo-200';
  
  return 'bg-slate-100 text-slate-700 border-slate-200';
};

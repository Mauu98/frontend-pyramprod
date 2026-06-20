// Non-component exports — keep here for Vite Fast Refresh compatibility

export const inputBase = [
  'h-12 w-full rounded-lg px-4',
  'border border-[#D0D5DD] bg-white',
  'text-[15px] text-[#101828]',
  'placeholder:text-[#98A2B3]',
  'transition-colors duration-150',
  'focus:border-[#2C6B2F] focus:outline-none focus:ring-4 focus:ring-[#2C6B2F]/10',
].join(' ')

export const textareaBase = [
  'w-full resize-none rounded-lg px-4 py-3.5',
  'border border-[#D0D5DD] bg-white',
  'text-[15px] text-[#101828] leading-relaxed',
  'placeholder:text-[#98A2B3]',
  'transition-colors duration-150',
  'focus:border-[#2C6B2F] focus:outline-none focus:ring-4 focus:ring-[#2C6B2F]/10',
].join(' ')

export const inputError = [
  'border-red-400 bg-red-50/40',
  'focus:border-red-500 focus:ring-red-500/10',
].join(' ')

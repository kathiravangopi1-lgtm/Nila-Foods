import Input from '@/components/ui/Input'

function OtpCodeInput({ value, onChange, disabled = false }) {
  return (
    <label htmlFor="email-otp" className="block">
      <span className="mb-2 block text-sm font-semibold text-stone-700 dark:text-stone-200">6-digit verification code</span>
      <Input
        id="email-otp"
        name="otp"
        type="text"
        inputMode="numeric"
        autoComplete="one-time-code"
        pattern="[0-9]{6}"
        maxLength={6}
        required
        disabled={disabled}
        value={value}
        onChange={(event) => onChange(event.target.value.replace(/\D/g, '').slice(0, 6))}
        className="h-14 text-center text-2xl font-bold tracking-[0.5em]"
        aria-describedby="email-otp-help"
      />
      <span id="email-otp-help" className="sr-only">Enter the code sent to your email.</span>
    </label>
  )
}

export default OtpCodeInput

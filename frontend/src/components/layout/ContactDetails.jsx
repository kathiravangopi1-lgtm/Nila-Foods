import { contactDetails } from '@/lib/contact'

function ContactDetails() {
  return (
    <ul className="mt-3 space-y-2 text-sm text-stone-600 dark:text-stone-300">
      <li>
        <span className="font-semibold text-stone-800 dark:text-stone-100">Email: </span>
        {contactDetails.email
          ? <a className="break-all hover:text-emerald-800 dark:hover:text-emerald-300" href={`mailto:${contactDetails.email}`}>{contactDetails.email}</a>
          : <span>Not configured</span>}
      </li>
      <li>
        <span className="font-semibold text-stone-800 dark:text-stone-100">Contact number: </span>
        {contactDetails.phone
          ? <a className="hover:text-emerald-800 dark:hover:text-emerald-300" href={`tel:${contactDetails.phone}`}>{contactDetails.phone}</a>
          : <span>Not configured</span>}
      </li>
    </ul>
  )
}

export default ContactDetails

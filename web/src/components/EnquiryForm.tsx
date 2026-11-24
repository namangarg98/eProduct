import { useState, type FormEvent } from 'react';
import { api, ApiError } from '../api.ts';

type Field = 'name' | 'email' | 'phone' | 'message';
type Values = Record<Field, string>;
type Errors = Partial<Record<Field, string>>;

const EMPTY: Values = { name: '', email: '', phone: '', message: '' };
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const PHONE_PATTERN = /^[0-9 +()-]*$/;

/** Quick feedback only: the API is the real validation boundary. */
function validate(values: Values): Errors {
  const errors: Errors = {};
  if (!values.name.trim()) errors.name = 'Name is required';
  if (!EMAIL_PATTERN.test(values.email.trim())) errors.email = 'A valid email is required';
  if (!PHONE_PATTERN.test(values.phone)) errors.phone = 'Phone may only contain digits, spaces and + ( ) -';
  return errors;
}

export function EnquiryForm({ productId }: { productId: string }) {
  const [values, setValues] = useState<Values>(EMPTY);
  const [errors, setErrors] = useState<Errors>({});
  const [status, setStatus] = useState<'idle' | 'submitting' | 'sent'>('idle');
  const [submitError, setSubmitError] = useState<string>();

  if (status === 'sent') {
    return (
      <p role="status" className="success">
        Thank you! We've received your enquiry and will be in touch soon.
      </p>
    );
  }

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    const found = validate(values);
    setErrors(found);
    if (Object.keys(found).length > 0) return;

    setStatus('submitting');
    setSubmitError(undefined);
    try {
      await api.submitEnquiry({
        productId,
        name: values.name.trim(),
        email: values.email.trim(),
        phone: values.phone.trim() || undefined,
        message: values.message.trim() || undefined,
      });
      setStatus('sent');
    } catch (error) {
      setStatus('idle');
      setSubmitError(error instanceof ApiError ? error.message : 'Something went wrong, please try again');
    }
  }

  const field = (name: Field, label: string, props: { type?: string; maxLength: number; multiline?: boolean }) => (
    <div className="field">
      <label htmlFor={`enquiry-${name}`}>{label}</label>
      {props.multiline ? (
        <textarea
          id={`enquiry-${name}`}
          className="input"
          rows={4}
          maxLength={props.maxLength}
          value={values[name]}
          onChange={(event) => setValues({ ...values, [name]: event.target.value })}
        />
      ) : (
        <input
          id={`enquiry-${name}`}
          className="input"
          type={props.type ?? 'text'}
          maxLength={props.maxLength}
          value={values[name]}
          aria-invalid={errors[name] ? true : undefined}
          aria-describedby={errors[name] ? `enquiry-${name}-error` : undefined}
          onChange={(event) => setValues({ ...values, [name]: event.target.value })}
        />
      )}
      {errors[name] && (
        <span id={`enquiry-${name}-error`} className="error">
          {errors[name]}
        </span>
      )}
    </div>
  );

  return (
    <section className="card">
      <h2>Send an enquiry</h2>
      <form className="form" aria-label="Enquiry" onSubmit={handleSubmit} noValidate>
        {field('name', 'Name', { maxLength: 100 })}
        {field('email', 'Email', { type: 'email', maxLength: 254 })}
        {field('phone', 'Phone (optional)', { type: 'tel', maxLength: 30 })}
        {field('message', 'Message (optional)', { maxLength: 2000, multiline: true })}
        {submitError && (
          <p role="alert" className="alert">
            {submitError}
          </p>
        )}
        <button className="button" type="submit" disabled={status === 'submitting'}>
          {status === 'submitting' ? 'Sending…' : 'Send enquiry'}
        </button>
      </form>
    </section>
  );
}

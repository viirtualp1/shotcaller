alter table public.support_requests
  drop constraint support_requests_subject_check,
  drop constraint support_requests_message_check,
  add constraint support_requests_subject_check check (char_length(btrim(subject)) between 2 and 120),
  add constraint support_requests_message_check check (char_length(btrim(message)) between 10 and 4000);

# Security Policy

## Supported versions

The Shotcaller is a live web game: only the version currently running at
[theshotcaller.online](https://theshotcaller.online) and in the Discord Activity is supported. Fixes ship there
directly; older builds are not patched.

## Reporting a vulnerability

Please do not open a public issue for security problems.

- Use [private vulnerability reporting](https://github.com/viirtualp1/shotcaller/security/advisories/new) on GitHub,
  or
- email **shotcaller.team@gmail.com** with "Security" in the subject.

Include what you found, how to reproduce it and what an attacker could do with it. Please test only against your
own accounts, and do not access, change or delete other players' data.

You can expect a reply within a few days. Confirmed issues are fixed as soon as possible, and you will hear when
the fix is live. Reports are credited in the patch notes if you would like.

## Scope

In scope: the game client in this repository, its Supabase database functions and policies, and the Edge
Functions under `supabase/functions`.

Out of scope: denial-of-service and volumetric attacks, social engineering, and issues in third-party services
(Supabase, Vercel, Discord, Google, PostHog) that are not caused by this project's configuration.

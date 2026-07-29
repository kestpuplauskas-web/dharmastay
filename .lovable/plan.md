## Sukurti naują admin vartotoją

**Vartotojas:** info@revoo.lt  
**Slaptažodis:** Revoo@2026@  
**Rolė:** admin

### Žingsniai

1. Sukurti auth vartotoją per Supabase Admin API (`auth.users`) su patvirtintu el. paštu, kad iš karto galėtų prisijungti.
2. Įrašyti į `public.user_roles` naują eilutę su `role = 'admin'` naujai sukurto vartotojo `user_id`.
3. Patikrinti, kad įrašai sėkmingi.

### Techninės detalės

- Auth vartotojas kuriamas per `psql` neprieinamas (auth schema uždrausta), todėl naudosiu vidinį Supabase Admin API kvietimą per SQL `INSERT` į `auth.users` NEGALIMA — vietoj to naudosiu Supabase Management/Admin per įrankį.
- Konkrečiai: `supabase--insert` neveikia auth schemai. Todėl vartotoją sukursiu vienkartiniu server-side script'u naudojant service role (arba per Supabase auth admin per migration + insert kombinaciją tik user_roles daliai po to, kai auth vartotojas sukurtas).
- Praktinis kelias: paleisti mažą Node scriptą su `SUPABASE_SERVICE_ROLE_KEY` per `code--exec`, kuris iškviečia `supabase.auth.admin.createUser({ email, password, email_confirm: true })`, tada `supabase--insert` prideda rolę į `public.user_roles`.

update public.cars
set
  cover_image_url = '/cars/bmw-x4-2015/01.webp',
  image_urls = jsonb_build_array(
    '/cars/bmw-x4-2015/01.webp',
    '/cars/bmw-x4-2015/02.webp',
    '/cars/bmw-x4-2015/03.webp',
    '/cars/bmw-x4-2015/04.webp',
    '/cars/bmw-x4-2015/05.webp'
  ),
  updated_at = now()
where id = '1ad3aa1c-6014-464e-9800-e926d955d25b';
/** Kambarių parinkimas pagal svečių skaičių (administratoriaus rezervacijos forma). */

export type RoomCandidate = {
  id: string;
  name: string;
  capacity: number;
};

export type RoomGuests = {
  property_id: string;
  adults: number;
  children: number;
  infants: number;
};

/**
 * Parenka laisvų kambarių rinkinį, kurio bendra talpa padengia svečių skaičių.
 * Pirmiausia imami didžiausi kambariai, po to paskutinis pakeičiamas mažiausiu tinkamu.
 */
export function suggestRooms(candidates: RoomCandidate[], guests: number): string[] {
  if (guests <= 0) return [];
  const usable = candidates.filter((c) => c.capacity > 0);
  const sorted = [...usable].sort((a, b) => b.capacity - a.capacity);
  const picked: RoomCandidate[] = [];
  let left = guests;
  for (const c of sorted) {
    if (left <= 0) break;
    picked.push(c);
    left -= c.capacity;
  }
  if (picked.length === 0) return [];

  const head = picked.slice(0, -1);
  const need = guests - head.reduce((s, c) => s + c.capacity, 0);
  if (need > 0) {
    const usedIds = new Set(head.map((c) => c.id));
    const smaller = usable
      .filter((c) => !usedIds.has(c.id) && c.capacity >= need)
      .sort((a, b) => a.capacity - b.capacity)[0];
    if (smaller) picked[picked.length - 1] = smaller;
  }
  return picked.map((c) => c.id);
}

/** Automatiškai paskirsto svečius po kambarius pagal jų talpą. */
export function distributeGuests(
  rooms: RoomCandidate[],
  adults: number,
  children: number,
  infants: number,
): RoomGuests[] {
  let adultsLeft = adults;
  let childrenLeft = children;
  return rooms.map((room, index) => {
    const isLast = index === rooms.length - 1;
    const a = isLast ? adultsLeft : Math.min(room.capacity, adultsLeft);
    adultsLeft -= a;
    const rest = Math.max(0, room.capacity - a);
    const c = isLast ? childrenLeft : Math.min(rest, childrenLeft);
    childrenLeft -= c;
    return {
      property_id: room.id,
      adults: Math.max(0, a),
      children: Math.max(0, c),
      infants: index === 0 ? infants : 0,
    };
  });
}

export type RoomAllocation = RoomGuests & { total_amount: number };

export function totalCapacity(rooms: RoomCandidate[]): number {
  return rooms.reduce((s, r) => s + r.capacity, 0);
}

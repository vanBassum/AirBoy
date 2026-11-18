using System.Text;

namespace AirBoy.Api.Flights;

/// <summary>
/// Builds the base64 protobuf <c>tfs</c> parameter Google Flights uses for a search.
/// Schema (reverse engineered, see fast-flights):
///   Info { repeated FlightData data = 3; repeated Passenger passengers = 8 (packed);
///          Seat seat = 9; Trip trip = 19; }
///   FlightData { string date = 2; optional int32 max_stops = 5;
///                Airport from_airport = 13; Airport to_airport = 14; }
///   Airport { string airport = 2; }
/// </summary>
public static class TfsEncoder
{
    private const int SeatEconomy = 1;
    private const int TripOneWay = 2;
    private const int PassengerAdult = 1;

    public static string OneWay(string from, string to, string date, int maxStops, int adults)
    {
        var flight = new ProtoWriter()
            .String(2, date)
            .Int(5, maxStops)
            .Message(13, new ProtoWriter().String(2, from))
            .Message(14, new ProtoWriter().String(2, to));

        var passengers = Enumerable.Repeat((byte)PassengerAdult, Math.Clamp(adults, 1, 9)).ToArray();

        var info = new ProtoWriter()
            .Message(3, flight)
            .Bytes(8, passengers)
            .Int(9, SeatEconomy)
            .Int(19, TripOneWay);

        return Convert.ToBase64String(info.ToArray());
    }

    private sealed class ProtoWriter
    {
        private readonly MemoryStream _ms = new();

        public ProtoWriter Int(int field, int value)
        {
            Varint((uint)(field << 3));
            Varint((uint)value);
            return this;
        }

        public ProtoWriter String(int field, string value) => Bytes(field, Encoding.UTF8.GetBytes(value));

        public ProtoWriter Message(int field, ProtoWriter inner) => Bytes(field, inner.ToArray());

        public ProtoWriter Bytes(int field, byte[] value)
        {
            Varint((uint)(field << 3 | 2));
            Varint((uint)value.Length);
            _ms.Write(value);
            return this;
        }

        public byte[] ToArray() => _ms.ToArray();

        private void Varint(uint value)
        {
            while (value >= 0x80)
            {
                _ms.WriteByte((byte)(value | 0x80));
                value >>= 7;
            }
            _ms.WriteByte((byte)value);
        }
    }
}

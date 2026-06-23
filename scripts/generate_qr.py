from __future__ import annotations

from pathlib import Path
import sys


VERSION = 4
SIZE = 21 + 4 * (VERSION - 1)
DATA_CODEWORDS = 80
ECC_CODEWORDS = 20
FORMAT_BITS_L_MASK_0 = int("111011111000100", 2)


def append_bits(bits: list[int], value: int, length: int) -> None:
    for i in range(length - 1, -1, -1):
        bits.append((value >> i) & 1)


def gf_tables() -> tuple[list[int], list[int]]:
    exp = [0] * 512
    log = [0] * 256
    x = 1
    for i in range(255):
        exp[i] = x
        log[x] = i
        x <<= 1
        if x & 0x100:
            x ^= 0x11D
    for i in range(255, 512):
        exp[i] = exp[i - 255]
    return exp, log


GF_EXP, GF_LOG = gf_tables()


def gf_mul(a: int, b: int) -> int:
    if a == 0 or b == 0:
        return 0
    return GF_EXP[GF_LOG[a] + GF_LOG[b]]


def reed_solomon_generator(degree: int) -> list[int]:
    result = [1]
    for i in range(degree):
        next_result = [0] * (len(result) + 1)
        for j, coefficient in enumerate(result):
            next_result[j] ^= gf_mul(coefficient, 1)
            next_result[j + 1] ^= gf_mul(coefficient, GF_EXP[i])
        result = next_result
    return result


def reed_solomon_remainder(data: list[int], degree: int) -> list[int]:
    generator = reed_solomon_generator(degree)
    remainder = [0] * degree
    for byte in data:
        factor = byte ^ remainder[0]
        remainder = remainder[1:] + [0]
        for i in range(degree):
            remainder[i] ^= gf_mul(generator[i + 1], factor)
    return remainder


def data_codewords(text: str) -> list[int]:
    payload = text.encode("utf-8")
    if len(payload) > 78:
        raise ValueError("This QR generator supports URLs up to 78 bytes.")

    bits: list[int] = []
    append_bits(bits, 0b0100, 4)
    append_bits(bits, len(payload), 8)
    for byte in payload:
        append_bits(bits, byte, 8)

    capacity = DATA_CODEWORDS * 8
    append_bits(bits, 0, min(4, capacity - len(bits)))
    while len(bits) % 8:
        bits.append(0)

    codewords = [
        int("".join(str(bit) for bit in bits[i : i + 8]), 2)
        for i in range(0, len(bits), 8)
    ]
    pads = [0xEC, 0x11]
    index = 0
    while len(codewords) < DATA_CODEWORDS:
        codewords.append(pads[index % 2])
        index += 1
    return codewords


def make_matrix(text: str) -> list[list[bool]]:
    matrix: list[list[bool | None]] = [[None] * SIZE for _ in range(SIZE)]
    function = [[False] * SIZE for _ in range(SIZE)]

    def set_module(row: int, col: int, value: bool, is_function: bool = True) -> None:
        if 0 <= row < SIZE and 0 <= col < SIZE:
            matrix[row][col] = value
            if is_function:
                function[row][col] = True

    def place_finder(row: int, col: int) -> None:
        for r in range(row - 1, row + 8):
            for c in range(col - 1, col + 8):
                if 0 <= r < SIZE and 0 <= c < SIZE:
                    if row <= r < row + 7 and col <= c < col + 7:
                        distance = max(abs(r - (row + 3)), abs(c - (col + 3)))
                        set_module(r, c, distance != 2)
                    else:
                        set_module(r, c, False)

    def place_alignment(center_row: int, center_col: int) -> None:
        for r in range(center_row - 2, center_row + 3):
            for c in range(center_col - 2, center_col + 3):
                distance = max(abs(r - center_row), abs(c - center_col))
                set_module(r, c, distance != 1)

    place_finder(0, 0)
    place_finder(0, SIZE - 7)
    place_finder(SIZE - 7, 0)
    place_alignment(26, 26)

    for i in range(8, SIZE - 8):
        set_module(6, i, i % 2 == 0)
        set_module(i, 6, i % 2 == 0)

    set_module(4 * VERSION + 9, 8, True)

    format_positions_1 = [
        (8, 0),
        (8, 1),
        (8, 2),
        (8, 3),
        (8, 4),
        (8, 5),
        (8, 7),
        (8, 8),
        (7, 8),
        (5, 8),
        (4, 8),
        (3, 8),
        (2, 8),
        (1, 8),
        (0, 8),
    ]
    format_positions_2 = (
        [(SIZE - 1 - i, 8) for i in range(8)]
        + [(8, SIZE - 15 + i) for i in range(8, 15)]
    )
    for positions in [format_positions_1, format_positions_2]:
        for i, (row, col) in enumerate(positions):
            set_module(row, col, bool((FORMAT_BITS_L_MASK_0 >> i) & 1))

    codewords = data_codewords(text)
    codewords.extend(reed_solomon_remainder(codewords, ECC_CODEWORDS))
    bits: list[int] = []
    for byte in codewords:
        append_bits(bits, byte, 8)

    bit_index = 0
    upward = True
    col = SIZE - 1
    while col > 0:
        if col == 6:
            col -= 1
        row_iter = range(SIZE - 1, -1, -1) if upward else range(SIZE)
        for row in row_iter:
            for current_col in [col, col - 1]:
                if not function[row][current_col]:
                    bit = bool(bits[bit_index]) if bit_index < len(bits) else False
                    mask = (row + current_col) % 2 == 0
                    matrix[row][current_col] = bit ^ mask
                    bit_index += 1
        upward = not upward
        col -= 2

    return [[bool(cell) for cell in row] for row in matrix]


def matrix_to_svg(matrix: list[list[bool]]) -> str:
    quiet = 4
    view_size = SIZE + quiet * 2
    modules = []
    for row, values in enumerate(matrix):
        for col, value in enumerate(values):
            if value:
                modules.append(f"M{col + quiet},{row + quiet}h1v1h-1z")
    path = "".join(modules)
    return (
        f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {view_size} {view_size}" '
        'shape-rendering="crispEdges" role="img" aria-label="CEALI notebook QR code">'
        f'<rect width="{view_size}" height="{view_size}" fill="#fff"/>'
        f'<path d="{path}" fill="#17211d"/>'
        "</svg>\n"
    )


def main() -> None:
    target = (
        sys.argv[1]
        if len(sys.argv) > 1
        else "https://www.ceali.org/tough-conversations-notebook"
    )
    out = Path(sys.argv[2]) if len(sys.argv) > 2 else Path("public/qr/ceali-notebook-qr.svg")
    out.parent.mkdir(parents=True, exist_ok=True)
    out.write_text(matrix_to_svg(make_matrix(target)), encoding="utf-8")
    print(f"Wrote {out} for {target}")


if __name__ == "__main__":
    main()

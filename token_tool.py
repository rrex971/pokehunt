#!/usr/bin/env python3
"""
token_tool.py

Small helper to generate and verify QR tokens for Pokemon and Gyms.

Usage examples:
  python3 token_tool.py pokemon encode Pikachu
  python3 token_tool.py gym encode mt-moon
  python3 token_tool.py pokemon link Pikachu --origin http://localhost:3000
  python3 token_tool.py verify --type gym --key "mismagius" --value <hex>

It uses sha256(name + QR_SECRET_KEY) by default. You can override the key with
the --key argument or via the QR_SECRET_KEY environment variable.
"""

import argparse
import hashlib
import os
import sys


def sha256_hex(value: str, key: str) -> str:
    h = hashlib.sha256()
    h.update((value + key).encode('utf-8'))
    return h.hexdigest()


def main():
    parser = argparse.ArgumentParser(description='Generate and verify QR tokens for Pokéhunt')
    subparsers = parser.add_subparsers(dest='command')

    # pokemon
    p_pokemon = subparsers.add_parser('pokemon', help='Pokemon token helpers')
    p_pokemon_sub = p_pokemon.add_subparsers(dest='sub')
    p_pokemon_encode = p_pokemon_sub.add_parser('encode', help='Encode pokemon name to token')
    p_pokemon_encode.add_argument('name')
    p_pokemon_encode.add_argument('--key', help='Secret key (overrides QR_SECRET_KEY env)')
    p_pokemon_encode.add_argument('--origin', help='Optional origin to build a full /catch link')

    p_pokemon_batch = p_pokemon_sub.add_parser('batch', help='Batch-generate tokens from a newline file')
    p_pokemon_batch.add_argument('--file', required=True, help='Path to newline-separated names file')
    p_pokemon_batch.add_argument('--key')
    p_pokemon_batch.add_argument('--origin', default='http://localhost:3000')

    p_pokemon_link = p_pokemon_sub.add_parser('link', help='Print link for pokemon')
    p_pokemon_link.add_argument('name')
    p_pokemon_link.add_argument('--key')
    p_pokemon_link.add_argument('--origin', default='http://localhost:3000')

    # gym
    p_gym = subparsers.add_parser('gym', help='Gym token helpers')
    p_gym_sub = p_gym.add_subparsers(dest='sub')
    p_gym_encode = p_gym_sub.add_parser('encode', help='Encode gym slug to token')
    p_gym_encode.add_argument('slug')
    p_gym_encode.add_argument('--key')
    p_gym_encode.add_argument('--origin', help='Optional origin to build a full /gym link')

    p_gym_link = p_gym_sub.add_parser('link', help='Print link for gym')
    p_gym_link.add_argument('slug')
    p_gym_link.add_argument('--key')
    p_gym_link.add_argument('--origin', default='http://localhost:3000')

    # verify
    p_verify = subparsers.add_parser('verify', help='Verify a token against a name/slug and key')
    p_verify.add_argument('--type', choices=['pokemon', 'gym'], required=True)
    p_verify.add_argument('--name', help='Pokemon name (for pokemon)')
    p_verify.add_argument('--slug', help='Gym slug (for gym)')
    p_verify.add_argument('--value', required=True, help='Hex token to verify')
    p_verify.add_argument('--key')

    args = parser.parse_args()

    env_key = os.environ.get('QR_SECRET_KEY')
    def resolve_key(cli_key):
        return cli_key or env_key or ''

    if args.command == 'pokemon':
        if args.sub == 'encode':
            key = resolve_key(args.key)
            if not key:
                print('Missing key: provide --key or set QR_SECRET_KEY env', file=sys.stderr)
                sys.exit(2)
            h = sha256_hex(args.name, key)
            if args.origin:
                print(f"{args.origin.rstrip('/')}/catch?p={h}")
            else:
                print(h)
            return
        if args.sub == 'link':
            key = resolve_key(args.key)
            if not key:
                print('Missing key: provide --key or set QR_SECRET_KEY env', file=sys.stderr)
                sys.exit(2)
            h = sha256_hex(args.name, key)
            print(f"{args.origin.rstrip('/')}/catch?p={h}")
            return
        if args.sub == 'batch':
            key = resolve_key(args.key)
            if not key:
                print('Missing key: provide --key or set QR_SECRET_KEY env', file=sys.stderr)
                sys.exit(2)
            try:
                with open(args.file, 'r', encoding='utf-8') as fh:
                    for line in fh:
                        name = line.strip()
                        if not name:
                            continue
                        h = sha256_hex(name, key)
                        link = f"{args.origin.rstrip('/')}/catch?p={h}"
                        print(f'{name},{h},{link}')
            except FileNotFoundError:
                print('File not found: ' + args.file, file=sys.stderr)
                sys.exit(2)
            return

    if args.command == 'gym':
        if args.sub == 'encode':
            key = resolve_key(args.key)
            if not key:
                print('Missing key: provide --key or set QR_SECRET_KEY env', file=sys.stderr)
                sys.exit(2)
            h = sha256_hex(args.slug, key)
            if args.origin:
                print(f"{args.origin.rstrip('/')}/gym?p={h}")
            else:
                print(h)
            return
        if args.sub == 'link':
            key = resolve_key(args.key)
            if not key:
                print('Missing key: provide --key or set QR_SECRET_KEY env', file=sys.stderr)
                sys.exit(2)
            h = sha256_hex(args.slug, key)
            print(f"{args.origin.rstrip('/')}/gym?p={h}")
            return

    if args.command == 'verify':
        key = resolve_key(args.key)
        if not key:
            print('Missing key: provide --key or set QR_SECRET_KEY env', file=sys.stderr)
            sys.exit(2)
        if args.type == 'pokemon':
            if not args.name:
                print('--name is required for pokemon verification', file=sys.stderr)
                sys.exit(2)
            expected = sha256_hex(args.name, key)
            print('OK' if expected == args.value else 'INVALID')
            return
        if args.type == 'gym':
            if not args.slug:
                print('--slug is required for gym verification', file=sys.stderr)
                sys.exit(2)
            expected = sha256_hex(args.slug, key)
            print('OK' if expected == args.value else 'INVALID')
            return

    parser.print_help()


if __name__ == '__main__':
    main()

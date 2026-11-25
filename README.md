# 4. Translate Arrow Messages & Notes (ONLY if line actually has an arrow or note)
            colon_match = re.match(r'^([^:]+:[ \t]*)(.+)$', line)
            if colon_match and (re.search(r'[-.]+>|<[-.]+', colon_match.group(1)) or 'note' in colon_match.group(1).lower()):
                syntax_part = colon_match.group(1)
                msg_text = colon_match.group(2).strip().strip('"')
                translated_lines.append(f'{syntax_part}{call_api(msg_text)}')
                continue

            # 5. Translate Quoted Labels (participant, actor, component, rectangle, etc.)
            if '"' in line:
                new_line = re.sub(
                    r'"([^"]+)"',
                    lambda m: f'"{call_api(m.group(1)).replace(chr(34), "")}"',
                    line
                )
                translated_lines.append(new_line)
                continue

            # 6. Leave everything else untouched
            translated_lines.append(line)

        return '\n'.join(translated_lines)

    # Matches .. uml:: AND all indented or blank lines underneath it
    pattern = r'(^\.\. uml::[^\n]*(?:\n(?:[ \t]+[^\n]*|[ \t]*))*)'
    source[0] = re.sub(pattern, translate_uml_block, raw_rst_text, flags=re.MULTILINE)

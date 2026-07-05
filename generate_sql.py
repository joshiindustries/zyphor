import re

def generate_sql(prisma_file):
    with open(prisma_file, 'r') as f:
        content = f.read()

    models = re.findall(r'model\s+(\w+)\s+{([^}]+)}', content)
    
    sql = []
    
    sql.append("-- Enable UUID generation")
    sql.append("create extension if not exists pgcrypto;\n")
    
    for model_name, model_body in models:
        table_name_match = re.search(r'@@map\("([^"]+)"\)', model_body)
        table_name = table_name_match.group(1) if table_name_match else model_name.lower() + "s"
        
        sql.append(f'create table if not exists public."{table_name}" (')
        
        lines = model_body.strip().split('\n')
        columns = []
        foreign_keys = []
        unique_constraints = []
        
        for line in lines:
            line = line.strip()
            if not line or line.startswith('//') or line.startswith('@@'):
                continue
                
            parts = [p for p in line.split() if p]
            if len(parts) < 2:
                continue
                
            col_name = parts[0]
            col_type = parts[1]
            
            # Skip relations
            if col_type in [m[0] for m in models] or col_type.endswith('[]') or '?' in col_type and col_type[:-1] in [m[0] for m in models]:
                continue
            
            # Map types
            pg_type = 'text'
            if 'Int' in col_type: pg_type = 'integer'
            if 'Boolean' in col_type: pg_type = 'boolean'
            if 'DateTime' in col_type: pg_type = 'timestamptz'
            if 'BigInt' in col_type: pg_type = 'bigint'
            if 'uuid' in col_name.lower() or 'id' in col_name.lower(): pg_type = 'uuid' # Supabase prefers uuid
            
            # Special case for providerAccountId (not uuid)
            if col_name == 'providerAccountId' or col_name == 'id_token' or col_name == 'refresh_token' or col_name == 'access_token' or col_name == 'session_state':
                pg_type = 'text'
            
            constraints = []
            
            if '@id' in line:
                constraints.append('primary key')
                if '@default(uuid())' in line:
                    constraints.append('default gen_random_uuid()')
            
            if '?' not in col_type and '@id' not in line:
                constraints.append('not null')
                
            if '@unique' in line:
                constraints.append('unique')
                
            if '@default(now())' in line:
                constraints.append('default now()')
                
            if '@default(false)' in line:
                constraints.append('default false')
            if '@default(true)' in line:
                constraints.append('default true')
            if '@default(0)' in line:
                constraints.append('default 0')
            if '@default(1)' in line:
                constraints.append('default 1')
                
            # Default strings
            default_match = re.search(r'@default\("([^"]+)"\)', line)
            if default_match:
                constraints.append(f"default '{default_match.group(1)}'")
                
            col_def = f'  "{col_name}" {pg_type}'
            if constraints:
                col_def += ' ' + ' '.join(constraints)
                
            columns.append(col_def)
            
        sql.append(',\n'.join(columns))
        sql.append(');\n')
        
        # Indexes and unique constraints
        for line in lines:
            if line.strip().startswith('@@unique'):
                match = re.search(r'@@unique\(\[([^\]]+)\]\)', line)
                if match:
                    cols = [c.strip() for c in match.group(1).split(',')]
                    cols_str = '", "'.join(cols)
                    sql.append(f'alter table public."{table_name}" add unique ("{cols_str}");')
            if line.strip().startswith('@@index'):
                match = re.search(r'@@index\(\[([^\]]+)\]\)', line)
                if match:
                    cols = [c.strip() for c in match.group(1).split(',')]
                    idx_name = f'idx_{table_name}_{"_".join(cols)}'
                    cols_str = '", "'.join(cols)
                    sql.append(f'create index if not exists {idx_name} on public."{table_name}"("{cols_str}");')
                    
        sql.append("")
        
    return '\n'.join(sql)

if __name__ == "__main__":
    sql = generate_sql('prisma/schema.prisma')
    with open('full_schema.sql', 'w') as f:
        f.write(sql)

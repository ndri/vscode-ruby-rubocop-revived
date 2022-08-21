export const rubyFileWithWarnings = `
  def someMethod(    arg )
    if arg
      return arg
    end

    return :default
    end                    
`;

export const rubyFileToQuickFix = `
if something and other and 4
  return nil
end

{
      car: 3, # some comment
    boot: 56, bonnet: 10
}

def someMethod(    arg )
  if arg
    return arg
  end

  return :default
  end                    
`;

export const jsFile = `
  function printHello() {
    console.log("Hi i'm JavaScript!")
  }

  let something = 3;
`;

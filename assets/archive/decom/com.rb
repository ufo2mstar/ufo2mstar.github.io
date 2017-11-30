require 'base64'

class EncodeHtml
  def initialize()
  end

  def img64(path)

    ext = File.extname(path).strip.downcase[1..-1]
    # enc = Base64.encode64(File.open(path, "rb").read) # gives pretty output
    enc = Base64.strict_encode64(File.open(path, "rb").read)
    "data:image/#{ext};base64," + enc
  end

  def html ary
    out = ['<!doctype html><html lang="en"><head> </head><body>',]
    ary.each {|path| out << "<img alt='#{path}' \ntitle='#{File.basename path}'\n src='#{img64 path}'\n>\n</br>"}
    out << '</body></html>'
    File.open("based64.html", 'w') {|f| out.each {|line| f.write line}}
  end

end

ary = if ARGV.length > 0
        ARGV
      else
        %w[
kod.png
]
      end

puts EncodeHtml.new.html ary
